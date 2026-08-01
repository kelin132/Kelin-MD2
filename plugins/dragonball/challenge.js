/**
 * KELIN MD — DBZ PvP challenge (plugins/dbz/challenge.js)
 * .dbzchallenge @user  — send a challenge
 * .dbzchallenge accept — accept one
 *
 * Mirrors plugins/pokemon/challenge.js pattern.
 */

import { getFighter } from "../../lib/dbz/dbzDb.mjs";
import {
  setPendingChallenge, getIncomingChallenge,
  clearPendingChallenge, startPvPBattle, hasBattle,
} from "../../lib/dbz/battleState.mjs";
import { generateBattleScene } from "../../lib/dbz/canvas.mjs";

export default {
  name:        "dbzchallenge",
  aliases:     ["dbzch", "dbzpvp"],
  description: "Challenge a user to a Dragon Ball Z battle, or accept a challenge",
  category:    "dbz",
  usage:       ".dbzchallenge @user  OR  .dbzchallenge accept",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    // ── Accept ──────────────────────────────────────────────────────────────
    if ((args[0] || "").toLowerCase() === "accept") {
      const incoming = getIncomingChallenge(sender);
      if (!incoming) {
        return sock.sendMessage(jid, {
          text: "❌ You have no pending DBZ challenge to accept!",
        }, { quoted: msg });
      }

      if (hasBattle(jid)) {
        return sock.sendMessage(jid, { text: "⚔️ A battle is already happening here!" }, { quoted: msg });
      }

      const [challengerFighter, opponentFighter] = await Promise.all([
        getFighter(incoming.challengerJid),
        getFighter(sender),
      ]);

      if (!challengerFighter || !opponentFighter) {
        clearPendingChallenge(incoming.challengerJid);
        return sock.sendMessage(jid, {
          text: "❌ One of the fighters hasn't picked a character yet! Use *.dbzselect* first.",
        }, { quoted: msg });
      }

      if ((challengerFighter.hp || 0) <= 0 || (opponentFighter.hp || 0) <= 0) {
        clearPendingChallenge(incoming.challengerJid);
        return sock.sendMessage(jid, {
          text: "❌ One of the fighters is defeated! Use *.dbzheal* to recover first.",
        }, { quoted: msg });
      }

      clearPendingChallenge(incoming.challengerJid);

      const challengerUsername = (await sock.onWhatsApp(incoming.challengerJid).catch(() => []))[0]?.notify
        || incoming.challengerJid.split("@")[0];
      const opponentUsername   = msg.pushName || sender.split("@")[0];

      const battle = startPvPBattle(jid,
        { jid: incoming.challengerJid, username: challengerUsername, fighter: challengerFighter },
        { jid: sender,                 username: opponentUsername,   fighter: opponentFighter  }
      );

      let buf;
      try {
        buf = await generateBattleScene({
          player: {
            name:    challengerFighter.name,
            level:   challengerFighter.level,
            hp:      challengerFighter.hp,
            maxHp:   challengerFighter.maxHp,
            ki:      challengerFighter.ki || challengerFighter.maxKi,
            maxKi:   challengerFighter.maxKi,
            imageUrl: challengerFighter.imageUrl,
            race:    challengerFighter.race,
          },
          enemy: {
            name:    opponentFighter.name,
            level:   opponentFighter.level,
            hp:      opponentFighter.hp,
            maxHp:   opponentFighter.maxHp,
            ki:      opponentFighter.ki || opponentFighter.maxKi,
            maxKi:   opponentFighter.maxKi,
            imageUrl: opponentFighter.imageUrl,
            race:    opponentFighter.race,
          },
          round:      1,
          statusText: `${challengerUsername} vs ${opponentUsername}!`,
        });
      } catch {}

      const caption =
`⚔️ *DBZ BATTLE BEGINS!*

🔵 ${challengerUsername}: *${challengerFighter.name}* Lv.${challengerFighter.level} ❤️ ${challengerFighter.hp}/${challengerFighter.maxHp}
🔴 ${opponentUsername}: *${opponentFighter.name}* Lv.${opponentFighter.level} ❤️ ${opponentFighter.hp}/${opponentFighter.maxHp}

🐉 *${challengerUsername}'s turn!*

*Battle Commands:*
⚔️ \`.dbzbattle fight <1-6>\` — use a move
🌟 \`.dbzbattle fight 6\` — transform (if available)
🛡️ \`.dbzbattle fight 5\` — guard
🏃 \`.dbzbattle run\` — forfeit`;

      if (buf) {
        await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
      return;
    }

    // ── Resolve opponent ─────────────────────────────────────────────────────
    const ctx        = msg.message?.extendedTextMessage?.contextInfo;
    const mentionedJid = ctx?.mentionedJid?.[0] || null;
    const quotedSender =
      ctx?.participant ||
      (msg.quoted?.key?.participant ?? null) ||
      (msg.quoted?.key?.remoteJid !== jid ? msg.quoted?.key?.remoteJid : null);

    const targetJid = mentionedJid || quotedSender || null;

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
          "Usage:\n" +
          "• *.dbzchallenge @user* — challenge a fighter\n" +
          "• *.dbzchallenge accept* — accept a challenge\n\n" +
          "Make sure both players have selected a character with *.dbzselect*",
      }, { quoted: msg });
    }

    if (targetJid === sender) {
      return sock.sendMessage(jid, { text: "❌ You can't challenge yourself!" }, { quoted: msg });
    }

    const myFighter = await getFighter(sender);
    if (!myFighter) {
      return sock.sendMessage(jid, {
        text: "❌ You haven't chosen a fighter yet!\nUse *.dbzselect* to pick your character.",
      }, { quoted: msg });
    }

    if ((myFighter.hp || 0) <= 0) {
      return sock.sendMessage(jid, {
        text: "💔 Your fighter is defeated! Use *.dbzheal* to recover first.",
      }, { quoted: msg });
    }

    const oppFighter = await getFighter(targetJid);
    if (!oppFighter) {
      return sock.sendMessage(jid, {
        text: "❌ That user hasn't chosen a DBZ fighter yet! They need to use *.dbzselect* first.",
      }, { quoted: msg });
    }

    setPendingChallenge(sender, targetJid, jid, myFighter);

    const myName  = msg.pushName || sender.split("@")[0];
    const oppNum  = targetJid.split("@")[0];
    await sock.sendMessage(jid, {
      text:
`⚔️ *DBZ BATTLE CHALLENGE!*

⚡ *${myName}* challenges @${oppNum} to a Dragon Ball Z battle!

🐉 Their fighter: *${myFighter.name}* Lv.${myFighter.level}
❤️ HP: ${myFighter.hp}/${myFighter.maxHp}

Type *.dbzchallenge accept* to accept within 2 minutes!`,
      mentions: [targetJid],
    }, { quoted: msg });
  },
};
