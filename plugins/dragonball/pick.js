/**
 * KELIN MD — DBZ Fighter Pick (plugins/dragonball/pick.js)
 * .dbzpick <number|name> — lock in your character
 */

import { listCharacters, getCharacterByName } from "../../lib/dbz/api.mjs";
import { buildFighter, saveFighter } from "../../lib/dbz/dbzDb.mjs";

const PER_PAGE = 8;

export default {
  name:        "dbzpick",
  aliases:     ["dbzchoose", "dbzswitch"],
  description: "Select your Dragon Ball Z fighter",
  category:    "dragonball",
  usage:       ".dbzpick <number or name>",

  async run({ sock, msg, sender, args }) {
    const jid   = msg.key.remoteJid;
    const input = args.join(" ").trim();

    if (!input) {
      return sock.sendMessage(jid, {
        text: "Usage: *.dbzpick <number or name>*\nExample: *.dbzpick 1*  or  *.dbzpick Goku*\n\nUse *.dbzselect* to browse all fighters.",
      }, { quoted: msg });
    }

    let charDoc = null;

    // Try by global roster number first
    const num = parseInt(input);
    if (!isNaN(num) && num > 0) {
      const page   = Math.ceil(num / PER_PAGE);
      const offset = (num - 1) % PER_PAGE;
      const { items } = await listCharacters({ page, perPage: PER_PAGE });
      charDoc = items[offset] || null;
    }

    // Try by name
    if (!charDoc) {
      charDoc = await getCharacterByName(input);
    }

    if (!charDoc) {
      return sock.sendMessage(jid, {
        text: `❌ No fighter found for "*${input}*".\nUse *.dbzselect* to browse available fighters.`,
      }, { quoted: msg });
    }

    const fighter = buildFighter(charDoc, sender, 5);
    await saveFighter(fighter);

    const forms = (charDoc.forms || []).map((f, i) =>
      `  *${i + 1}.* ${f.name} (×${f.statMultiplier})`
    ).join("\n");

    const caption =
`🐉 *FIGHTER SELECTED!*

👤 Fighter: *${msg.pushName || "Fighter"}*
⚡ Character: *${charDoc.name}*
🌍 Race: ${charDoc.race || "Unknown"}
❤️ HP: ${fighter.hp}/${fighter.maxHp}
⚔️ Attack: ${fighter.attack}
🛡️ Defense: ${fighter.defense}
💨 Speed: ${fighter.speed}
💠 Ki: ${fighter.ki}/${fighter.maxKi}
📊 Level: ${fighter.level}
${forms ? `\n🌟 *Transformations:*\n${forms}\n` : ""}
⚡ Ki: ${charDoc.kiFlavorText || "Unknown"}

*You are ready to fight!*
Use *.dbzchallenge @user* to challenge someone
or wait for a villain to appear with *.dbzspawn on*`;

    try {
      await sock.sendMessage(jid, { image: { url: charDoc.imageUrl }, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
