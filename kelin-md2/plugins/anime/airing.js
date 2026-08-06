// plugins/anime/airing.js
// Show currently airing anime via David Cyril API
// .airing         — list all currently airing
// .airing <name>  — filter list by name

import { getAiringAnime } from "../../lib/davidcyrilAPI.mjs";

export default {
  name: "airing",
  aliases: ["nextep", "airingtime", "airingnow"],
  description: "See currently airing anime (optionally search by name)",
  category: "anime",
  usage: ".airing [anime name]",
  cooldown: 8,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    try {
      const list = await getAiringAnime();

      if (!list.length) {
        return sock.sendMessage(jid, {
          text: "❌ No currently airing anime found. Try again later.",
        }, { quoted: msg });
      }

      // Filter by name if provided
      const query = text?.toLowerCase().trim();
      const filtered = query
        ? list.filter(a =>
            a.title?.toLowerCase().includes(query) ||
            a.title_english?.toLowerCase().includes(query)
          )
        : list;

      if (query && !filtered.length) {
        return sock.sendMessage(jid, {
          text: `❌ No airing anime matched *"${text}"*.\n\nUse *.airing* (no args) to see the full list.`,
        }, { quoted: msg });
      }

      const show = filtered.slice(0, 10);

      let txt = query
        ? `📺 *AIRING — Search: "${text}"* (${filtered.length} found)\n\n`
        : `📺 *CURRENTLY AIRING ANIME* 📺\n\n`;

      show.forEach((a, i) => {
        const name    = a.title_english || a.title;
        const ep      = a.latest_episode ? `Ep ${a.latest_episode}` : "Ep ?";
        const score   = a.score ? `⭐ ${a.score}` : "";
        txt += `${i + 1}. *${name}*\n   📡 ${ep}${score ? "  " + score : ""}\n`;
      });

      if (filtered.length > 10) txt += `\n_...and ${filtered.length - 10} more_`;

      // Send with image of first result if available
      const cover = show[0]?.image;
      if (cover) {
        await sock.sendMessage(jid, { image: { url: cover }, caption: txt }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: txt }, { quoted: msg });
      }

    } catch (err) {
      await sock.sendMessage(jid, {
        text: "❌ Failed to fetch airing anime. Try again later.",
      }, { quoted: msg });
    }
  },
};
