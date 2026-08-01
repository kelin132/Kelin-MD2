/**
 * KELIN MD — DBZ Fighter Profile (plugins/dbz/dbzprofile.js)
 * .dbzprofile — show your fighter's stats
 * .dbzprofile @user — view someone else's fighter
 */

import { getFighter } from "../../lib/dbz/dbzDb.mjs";
import { getXpNeeded } from "../../lib/dbz/gameLogic.mjs";

export default {
  name:        "dbzprofile",
  aliases:     ["dbzstats", "dbzme"],
  description: "Show your DBZ fighter's profile and stats",
  category:    "dbz",
  usage:       ".dbzprofile [@user]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    // Resolve target (self or mentioned)
    const ctx           = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid  = ctx?.mentionedJid?.[0] || null;
    const targetJid     = mentionedJid || sender;
    const isSelf        = targetJid === sender;

    const fighter = await getFighter(targetJid);
    if (!fighter) {
      const who = isSelf ? "You haven't" : "That user hasn't";
      return sock.sendMessage(jid, {
        text: `❌ ${who} chosen a DBZ fighter yet!\nUse *.dbzselect* to pick a character.`,
      }, { quoted: msg });
    }

    const hpBar  = buildBar(fighter.hp,    fighter.maxHp,   24, "🟥", "⬛");
    const xpBar  = buildBar(fighter.xp,    fighter.xpNeeded || getXpNeeded(fighter.level), 20, "🟨", "⬛");
    const kiBar  = buildBar(fighter.ki || 0, fighter.maxKi || 300, 20, "🟦", "⬛");

    const forms = (fighter.forms || []).length > 0
      ? fighter.forms.map((f, i) => `  *${i + 1}.* ${f.name} (×${f.statMultiplier})`).join("\n")
      : "  _None_";

    const caption =
`🐉 *DBZ FIGHTER PROFILE*

👤 Owner: ${isSelf ? "You" : "@" + targetJid.split("@")[0]}
⚡ Fighter: *${fighter.name}*
🌍 Race: ${fighter.race || "Unknown"}
📊 Level: *${fighter.level}*

❤️ HP:  ${hpBar}  ${fighter.hp}/${fighter.maxHp}
💠 Ki:  ${kiBar}  ${Math.floor(fighter.ki || 0)}/${fighter.maxKi || 300}
✨ XP:  ${xpBar}  ${fighter.xp}/${fighter.xpNeeded || getXpNeeded(fighter.level)}

━━━━━━━━━━━━━━━━━━━━
⚔️ Attack:  ${fighter.attack}
🛡️ Defense: ${fighter.defense}
💨 Speed:   ${fighter.speed}
${fighter.transformed ? `🌟 Form: *${fighter.currentFormName}*` : ""}

━━━━━━━━━━━━━━━━━━━━
🏆 Wins:   ${fighter.wins || 0}
💀 Losses: ${fighter.losses || 0}

🌟 *Transformations:*
${forms}`;

    try {
      await sock.sendMessage(jid, {
        image: { url: fighter.imageUrl },
        caption,
        mentions: isSelf ? [] : [targetJid],
      }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, {
        text: caption,
        mentions: isSelf ? [] : [targetJid],
      }, { quoted: msg });
    }
  },
};

function buildBar(current, max, len, filledEmoji, emptyEmoji) {
  const pct    = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const filled = Math.round(pct * len);
  const empty  = len - filled;
  return filledEmoji.repeat(filled) + emptyEmoji.repeat(empty);
}
