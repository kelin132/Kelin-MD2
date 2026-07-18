export default {
  name: "wiki",
  description: "Search Wikipedia",
  category: "search",
  usage: ".wiki <query>",
  aliases: ["wikipedia"],
  cooldown: 10,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg, text }) {
    if (!text) {
      await sock.sendMessage(msg.key.remoteJid, { text: "Usage: .wiki <search term>" });
      return;
    }
    try {
      const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Not found");
      const data = await res.json();
      const reply = `*${data.title}*\n\n${data.extract?.slice(0, 500) ?? "No summary available."}...\n\n🔗 ${data.content_urls?.desktop?.page ?? ""}`;
      await sock.sendMessage(msg.key.remoteJid, { text: reply });
    } catch {
      await sock.sendMessage(msg.key.remoteJid, { text: `No Wikipedia article found for "${text}".` });
    }
  },
};
