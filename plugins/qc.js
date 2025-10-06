import axios from 'axios';
import StickerFormatter from 'wa-sticker-formatter';
import { readUsersDb } from '../lib/database.js';
const { Sticker, StickerTypes } = StickerFormatter;

const qcCommand = {
  name: "qc",
  category: "sticker",
  description: "Crea un sticker de cita a partir de un texto.",
  aliases: [],

  async execute({ sock, msg, args, config }) {
    const from = msg.key.remoteJid;
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
    const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

    let who = mentionedJid || quoted?.participant || msg.sender;
    let text;
    let color = 'black';

    const validColors = {
        pink: '#FFC0CB', red: '#FF0000', blue: '#0000FF', green: '#008000', yellow: '#FFFF00',
        black: '#000000', white: '#FFFFFF', orange: '#FFA500', purple: '#800080', brown: '#A52A2A'
    };

    // Determinar el texto y el color
    if (quoted?.conversation) {
        text = quoted.conversation;
        if (args.length > 0 && validColors[args[0].toLowerCase()]) {
            color = args[0].toLowerCase();
        }
    } else {
        if (args.length > 0 && validColors[args[0].toLowerCase()]) {
            color = args[0].toLowerCase();
            text = args.slice(1).join(' ');
        } else {
            text = args.join(' ');
        }
    }

    if (!text) {
        return sock.sendMessage(from, { text: `📌 *Ejemplo de uso:*\n.qc [color] <texto>\n\nO responde a un mensaje con .qc [color]\n\n*Colores disponibles:*\n${Object.keys(validColors).join(', ')}` }, { quoted: msg });
    }

    // Obtener la foto de perfil
    let ppUrl;
    try {
        ppUrl = await sock.profilePictureUrl(who, 'image');
    } catch {
        ppUrl = 'https://telegra.ph/file/320b066dc81928b782c7b.png'; // URL por defecto
    }

    const usersDb = readUsersDb();
    const name = usersDb[who]?.name || who.split('@')[0];

    const payload = {
        type: "quote",
        format: "png",
        backgroundColor: validColors[color],
        width: 512,
        height: 768,
        scale: 2,
        messages: [{
            entities: [],
            avatar: true,
            from: {
                id: 1,
                name: name,
                photo: { url: ppUrl }
            },
            text: text,
            replyMessage: {}
        }]
    };

    await sock.sendMessage(from, { react: { text: '💬', key: msg.key } });

    try {
        const { data } = await axios.post('https://qc.botcahx.eu.org/generate', payload, {
            headers: { 'Content-Type': 'application/json' }
        });

        if (!data.result?.image) {
            throw new Error("La API no generó una imagen válida.");
        }

        const imageBuffer = Buffer.from(data.result.image, 'base64');

        const sticker = new Sticker(imageBuffer, {
            pack: config.botName || 'Bot',
            author: config.ownerName || 'Jules',
            type: StickerTypes.FULL,
            quality: 70
        });

        const stickerMessage = await sticker.toMessage();
        await sock.sendMessage(from, stickerMessage, { quoted: msg });
        await sock.sendMessage(from, { react: { text: '✅', key: msg.key } });

    } catch (error) {
        console.error("Error en el comando qc:", error);
        await sock.sendMessage(from, { react: { text: '❌', key: msg.key } });
        await sock.sendMessage(from, { text: `🚨 Ocurrió un error al generar el sticker de cita. Detalles: ${error.message}` }, { quoted: msg });
    }
  }
};

export default qcCommand;