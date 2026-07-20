export default {
  name: "carbon",
  aliases: ["code2img", "codeimg"],
  description: "Turn code into a beautiful carbon image",
  category: "image",
  usage: ".carbon <code>  (or reply to a message with code)",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const quotedText = ctx?.quotedMessage?.conversation || ctx?.quotedMessage?.extendedTextMessage?.text;
    const codeText = quotedText || text;

    if (!codeText) return sock.sendMessage(jid, { text: "❌ Provide code or reply to a code message.\n\nExample: .carbon console.log('Hello!')" }, { quoted: msg });

    const url = `https://api.nexoracle.com/image-creating/carbon-img?apikey=free_key@maher_apis&text=${encodeURIComponent(codeText)}`;
    try {
      await sock.sendMessage(jid, { image: { url }, caption: "💻 *Carbon code image*" }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to create carbon image. Try again!" }, { quoted: msg });
    }
  },
};
