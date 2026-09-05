// plugins/naruto/nreset.js
// Owner command — Reset a user's ninja profile or stats
// Usage: .nreset @user [stats|full]

import players from "../../lib/naruto/players.js";

export default {
  name: "nreset",
  description: "Reset a user's ninja profile (owner only)",
  category: "naruto",
  usage: ".nreset @user [stats|full]",
  aliases: ["nwipe", "nresetuser"],
  cooldown: 5,
  isOwner: true,

  async run({ sock, msg, sender, args, text }) {
    const jid = msg.key.remoteJid;

    // Resolve target
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const targetJid =
      ctx?.mentionedJid?.[0] ||
      ctx?.participant ||
      null;

    if (!targetJid) {
      return sock.sendMessage(jid, {
        text:
`❌ Please mention or reply to the user to reset.

*Usage:*
• *.nreset @user* — reset HP & Chakra only
• *.nreset @user stats* — reset all combat stats to default
• *.nreset @user full* — completely wipe and delete profile`
      }, { quoted: msg });
    }

    const mode = (args[1] || args[0] || "").toLowerCase();
    const player = await players.get(targetJid);

    if (!player) {
      return sock.sendMessage(jid, {
        text: `❌ @${targetJid.split("@")[0]} doesn't have a ninja profile.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    const tag = `@${targetJid.split("@")[0]}`;

    // ── Full wipe — delete profile entirely
    if (mode === "full" || mode === "delete" || mode === "wipe") {
      await players.delete(targetJid);
      return sock.sendMessage(jid, {
        text: `✅ Ninja profile for ${tag} has been *completely deleted*.\nThey can use *.nstart* to create a new one.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    // ── Stats reset — restore to level-1 defaults but keep ryo/rank
    if (mode === "stats") {
      player.level      = 1;
      player.xp         = 0;
      player.xpNeeded   = 100;
      player.hp         = 100;
      player.maxHp      = 100;
      player.chakra     = 100;
      player.maxChakra  = 100;
      player.attack     = 10;
      player.defense    = 10;
      player.speed      = 10;
      player.wins       = 0;
      player.losses     = 0;
      player.rank       = "Academy Student";
      player.jutsu      = [];
      player.cooldowns  = {};
      await player.save();
      return sock.sendMessage(jid, {
        text: `✅ ${tag}'s ninja stats have been *reset to defaults*.\nRyo and inventory were preserved.`,
        mentions: [targetJid]
      }, { quoted: msg });
    }

    // ── Default — restore HP & Chakra only
    player.hp     = player.maxHp;
    player.chakra = player.maxChakra;
    player.cooldowns = {};
    await player.save();

    return sock.sendMessage(jid, {
      text: `✅ ${tag}'s HP & Chakra have been *restored* and cooldowns cleared.\n\n❤️ HP: ${player.hp}/${player.maxHp}\n💙 Chakra: ${player.chakra}/${player.maxChakra}`,
      mentions: [targetJid]
    }, { quoted: msg });
  }
};
