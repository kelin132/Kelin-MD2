/**
 * KELIN MD — DBZ Fighter Profile (plugins/dragonball/dbzprofile.js)
 * .dbzprofile — show your fighter's stats
 * .dbzprofile @user — view someone else's fighter
 *
 * Reads from dbz_players (same collection used by dbztrain / dbzhunt)
 * so level-ups and zeni earned through training/hunting are always current.
 */

import players from "../../lib/dragonball/players.js";
import { xpNeeded } from "../../lib/dragonball/utils.js";

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

    // Read from dbz_players — same collection that dbztrain and dbzhunt update
    const fighter = await players.get(targetJid);
    if (!fighter) {
      const who = isSelf ? "You haven't" : "That user hasn't";
      return sock.sendMessage(jid, {
        text: `❌ ${who} started a DBZ journey yet!\nUse *.dbzstart* to create a fighter.`,
      }, { quoted: msg });
    }

    const currentXpNeeded = fighter.xpNeeded || xpNeeded(fighter.level);

    const hpBar = buildBar(fighter.hp,         fighter.maxHp,       24, "🟥", "⬛");
    const xpBar = buildBar(fighter.xp,         currentXpNeeded,     20, "🟨", "⬛");
    const kiBar = buildBar(fighter.ki || 0,    fighter.maxKi || 80, 20, "🟦", "⬛");

    const forms = (fighter.forms || []).length > 0
      ? fighter.forms.map((f, i) => `  *${i + 1}.* ${f.name} (×${f.statMultiplier})`).join("\n")
      : "  _None_";

    const caption =
`🐉 *DBZ FIGHTER PROFILE*

👤 Owner: ${isSelf ? "You" : "@" + targetJid.split("@")[0]}
⚡ Fighter: *${fighter.character || fighter.name || "Unknown"}*
🌍 Race: ${fighter.race || "Unknown"}
📊 Level: *${fighter.level}*

❤️ HP:  ${hpBar}  ${fighter.hp}/${fighter.maxHp}
💠 Ki:  ${kiBar}  ${Math.floor(fighter.ki || 0)}/${fighter.maxKi || 80}
✨ XP:  ${xpBar}  ${fighter.xp}/${currentXpNeeded}

━━━━━━━━━━━━━━━━━━━━
⚔️ Attack:  ${fighter.attack}
🛡️ Defense: ${fighter.defense}
💨 Speed:   ${fighter.speed}

━━━━━━━━━━━━━━━━━━━━
💰 Coins:  ${(fighter.zeni || 0).toLocaleString()}
🏆 Wins:   ${fighter.wins || 0}
💀 Losses: ${fighter.losses || 0}
🎯 Missions: ${fighter.missionsCompleted || 0}

🌟 *Transformations:*
${forms}`;

    try {
      await sock.sendMessage(jid, {
        image: { url: fighter.characterImageUrl },
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
