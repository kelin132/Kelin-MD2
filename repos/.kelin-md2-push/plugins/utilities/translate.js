export default {
  name: "translate",
  description: "Translate text using Google Translate API",
  category: "utilities",
  usage: ".translate <lang> <text>",
  aliases: ["tr", "trans"],
  cooldown: 10,
  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) {
      return sock.sendMessage(jid, {
        text:
`🌐 *Translate Command*

Usage: .translate <language_code> <text>
Example: .translate es Hello World

Common codes: en, es, fr, de, it, pt, ru, ja, ko, zh, ar, hi, id, tr`,
      }, { quoted: msg });
    }

    const lang = args[0];
    const text = args.slice(1).join(" ");
    if (!/^[a-z]{2,10}(?:-[a-z]{2,4})?$/i.test(lang)) {
      return sock.sendMessage(jid, { text: "❌ Use a valid language code, for example: .translate es Hello World" }, { quoted: msg });
    }

    try {
      const response = await fetch(
        `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${encodeURIComponent(lang)}&dt=t&q=${encodeURIComponent(text)}`
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      const translated = result?.[0]?.map((part) => part?.[0] || "").join("");
      if (!translated) throw new Error("empty translation");

      return sock.sendMessage(jid, {
        text:
`🌐 *Translation*

📝 Original (${result[2] || "auto"}):
${text}

🔤 Translated (${lang.toLowerCase()}):
${translated}`,
      }, { quoted: msg });
    } catch (err) {
      console.error("[translate]", err.message);
      return sock.sendMessage(jid, { text: "❌ Translation failed. Check the language code and try again." }, { quoted: msg });
    }
  },
};
