import fetch from 'node-fetch';

const tiktokCommand = {
  name: "tiktok",
  category: "descargas",
  description: "Descarga un video de TikTok sin marca de agua.",
  aliases: ["tk", "tt"],

  async execute({ sock, msg, args }) {
    const url = args[0];
    if (!url || !url.includes("tiktok.com")) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: "🎶 Por favor, proporciona un enlace de TikTok válido."
      }, { quoted: msg });
    }

    await sock.sendMessage(msg.key.remoteJid, { react: { text: '⏳', key: msg.key } });

    try {
      const apiUrl = `https://api.yupra.my.id/api/downloader/tiktok?url=${encodeURIComponent(url)}`;
      const response = await fetch(apiUrl);
      const json = await response.json();

      if (!json.status === 200 || !json.result.status) {
        throw new Error("La API no pudo procesar el video.");
      }

      const videoData = json.result.data.find(item => item.type === "nowatermark");
      if (!videoData || !videoData.url) {
        throw new Error("No se encontró un video sin marca de agua.");
      }

      const videoUrl = videoData.url;
      const videoTitle = json.result.title || "Video de TikTok";
      const authorNickname = json.result.author.nickname || "Autor Desconocido";

      const caption = `
*🎬 Título:* ${videoTitle}
*👤 Autor:* ${authorNickname}

*¡Aquí está tu video!*
      `.trim();

      await sock.sendMessage(msg.key.remoteJid, {
        video: { url: videoUrl },
        caption: caption,
        mimetype: 'video/mp4'
      }, { quoted: msg });

      await sock.sendMessage(msg.key.remoteJid, { react: { text: '✅', key: msg.key } });

    } catch (error) {
      console.error("Error en el comando 'tiktok':", error);
      await sock.sendMessage(msg.key.remoteJid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(msg.key.remoteJid, {
        text: `❌ Hubo un error al descargar el video. Por favor, intenta con otro enlace.`
      }, { quoted: msg });
    }
  }
};

export default tiktokCommand;