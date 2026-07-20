import axios from "axios";

export default {
  name: "season",
  aliases: ["animeseason", "seasonanime"],
  description: "Get anime from a specific season",
  category: "anime",
  usage: ".season <year> <winter|spring|summer|fall>",
  cooldown: 8,

  async run({ sock, msg, args }) {
    const jid = msg.key.remoteJid;
    if (args.length < 2) return sock.sendMessage(jid, { text: "❌ Format: .season <year> <season>\n\nSeasons: winter, spring, summer, fall\nExample: .season 2024 winter" }, { quoted: msg });

    const year   = parseInt(args[0]);
    const season = args[1].toLowerCase();
    const valid  = ["winter", "spring", "summer", "fall"];

    if (!valid.includes(season)) return sock.sendMessage(jid, { text: "❌ Invalid season! Use: winter, spring, summer, fall" }, { quoted: msg });
    if (isNaN(year) || year < 1990 || year > 2030) return sock.sendMessage(jid, { text: "❌ Provide a valid year between 1990–2030." }, { quoted: msg });

    try {
      const { data } = await axios.get(`https://api.jikan.moe/v4/seasons/${year}/${season}?limit=10`);
      if (!data.data?.length) return sock.sendMessage(jid, { text: `❌ No anime found for ${season} ${year}.` }, { quoted: msg });

      let txt = `📺 *ANIME FROM ${season.toUpperCase()} ${year}* 📺\n\n`;
      data.data.slice(0, 10).forEach((a, i) => {
        txt += `${i + 1}. *${a.title}*\n   Type: ${a.type || "?"} | Score: ${a.score || "N/A"}\n`;
      });
      await sock.sendMessage(jid, { text: txt.trim() }, { quoted: msg });
    } catch (err) {
      console.error(err);
      await sock.sendMessage(jid, { text: "❌ Failed to fetch season anime. Try again later." }, { quoted: msg });
    }
  },
};
