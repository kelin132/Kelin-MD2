/**
 * KELIN MD — DBZ Fight (engage villain) — plugins/dbz/dbzfight.js
 * .dbzfight — engage the active villain in the current group
 *
 * Mirrors plugins/pokemon/catch.js → starts a battle against the villain.
 */

import { getVillain, clearVillain } from "../../lib/dbz/villainState.mjs";
import { getFighter } from "../../lib/dbz/dbzDb.mjs";
import { startVillainBattle, hasBattle } from "../../lib/dbz/battleState.mjs";
import { generateBattleScene } from "../../lib/dbz/canvas.mjs";

export default {
  name:        "dbzfight",
  aliases:     ["dbzengage", "dbzattack"],
  description: "Engage the villain that has appeared in this chat",
  category:    "dbz",
  usage:       ".dbzfight",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;

    const entry = getVillain(jid);
    if (!entry) {
      return sock.sendMessage(jid, {
        text: "😴 No villain has appeared here right now!\nWait for the next auto-spawn or use *.dbzspawn on* to enable auto-spawn.",
      }, { quoted: msg });
    }

    if (hasBattle(jid)) {
      return sock.sendMessage(jid, { text: "⚔️ A battle is already happening here!" }, { quoted: msg });
    }

    const myFighter = await getFighter(sender);
    if (!myFighter) {
      return sock.sendMessage(jid, {
        text: "❌ You haven't chosen a fighter yet!\nUse *.dbzselect* to pick your character.",
      }, { quoted: msg });
    }

    if ((myFighter.hp || 0) <= 0) {
      return sock.sendMessage(jid, {
        text: "💔 Your fighter is defeated! Use *.dbzheal* to recover.",
      }, { quoted: msg });
    }

    const villain  = entry.villain;
    const username = msg.pushName || sender.split("@")[0];

    const battle = startVillainBattle(jid,
      { jid: sender, username, fighter: myFighter },
      villain
    );

    let buf;
    try {
      buf = await generateBattleScene({
        player: {
          name:    myFighter.name,
          level:   myFighter.level,
          hp:      myFighter.hp,
          maxHp:   myFighter.maxHp,
          ki:      myFighter.ki || myFighter.maxKi,
          maxKi:   myFighter.maxKi,
          imageUrl: myFighter.imageUrl,
          race:    myFighter.race,
        },
        enemy: {
          name:    villain.name,
          level:   villain.level,
          hp:      villain.hp,
          maxHp:   villain.maxHp,
          ki:      villain.maxKi || 200,
          maxKi:   villain.maxKi || 200,
          imageUrl: villain.imageUrl,
          race:    villain.race,
        },
        round: 1,
        statusText: `${username} vs ${villain.name}!`,
      });
    } catch {}

    const caption =
`⚔️ *${username.toUpperCase()} ENGAGES ${villain.name.toUpperCase()}!*

🐉 *${username}:* ${myFighter.name} Lv.${myFighter.level} ❤️ ${myFighter.hp}/${myFighter.maxHp}  💠 ${myFighter.ki || myFighter.maxKi}/${myFighter.maxKi}
👹 *${villain.name}:* Lv.${villain.level} ❤️ ${villain.hp}/${villain.maxHp}${villain.kiFlavorText ? `\n⚡ Power: ${villain.kiFlavorText}` : ""}

*Battle Commands:*
⚔️ \`.dbzbattle fight\` — see your moves
⚔️ \`.dbzbattle fight <1-6>\` — use a move
🏃 \`.dbzbattle run\` — flee`;

    if (buf) {
      await sock.sendMessage(jid, { image: buf, caption }, { quoted: msg });
    } else {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  },
};
