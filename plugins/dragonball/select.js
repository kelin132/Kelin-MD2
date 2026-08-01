/**
 * KELIN MD — DBZ Character Select (plugins/dragonball/select.js)
 * .dbzselect [page] — browse the paginated character roster
 */

import { listCharacters, isCachePopulated, syncCharacters } from "../../lib/dbz/api.mjs";
import { generateCharacterSelectCanvas } from "../../lib/dbz/canvas.mjs";

const PER_PAGE = 8;

export default {
  name:        "dbzselect",
  aliases:     ["dbzroster", "dbzlist"],
  description: "Browse the Dragon Ball Z fighter roster",
  category:    "dragonball",
  usage:       ".dbzselect [page]",

  async run({ sock, msg, sender, args }) {
    const jid  = msg.key.remoteJid;
    const page = Math.max(1, parseInt(args[0]) || 1);

    // Ensure cache is populated on first use
    const populated = await isCachePopulated().catch(() => false);
    if (!populated) {
      await sock.sendMessage(jid, {
        text: "⏳ *Loading Dragon Ball Z roster...* This only happens once. Please wait!",
      }, { quoted: msg });
      try {
        await syncCharacters();
      } catch (err) {
        return sock.sendMessage(jid, {
          text: "❌ Failed to load the DBZ roster. Please try again in a moment.",
        }, { quoted: msg });
      }
    }

    const { items, total, totalPages } = await listCharacters({ page, perPage: PER_PAGE });

    if (!items.length) {
      return sock.sendMessage(jid, {
        text: `❌ No characters found on page ${page}. Try *.dbzselect 1*`,
      }, { quoted: msg });
    }

    let caption = `⚡ *DRAGON BALL Z FIGHTER SELECT* — Page ${page}/${totalPages}\n\n`;
    items.forEach((c, i) => {
      const num = (page - 1) * PER_PAGE + i + 1;
      caption += `*${num}.* 🐉 *${c.name}* — ${c.race || "Unknown"}\n`;
      if (c.kiFlavorText) caption += `   ⚡ Ki: ${c.kiFlavorText}\n`;
    });
    caption += `\n━━━━━━━━━━━━━━━━━━━━\n📖 *${total} total fighters* across ${totalPages} pages\n➤ *.dbzselect ${Math.min(page + 1, totalPages)}* for next page\n➤ *.dbzpick <number or name>* to choose your fighter`;

    try {
      const buf = await generateCharacterSelectCanvas(items, page, PER_PAGE);
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
