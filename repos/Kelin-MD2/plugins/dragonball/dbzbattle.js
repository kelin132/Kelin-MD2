/**
 * KELIN MD — .dbzbattle command
 * Simple Dragon Ball themed duel between users.
 */

export default {
  name: "dbzbattle",
  description: "Challenge someone to a Dragon Ball battle",
  category: "dragonball",
  usage: ".dbzbattle @user",
  aliases: ["dbzb", "saiyanbattle"],
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const sender = msg.key.participant || msg.key.remoteJid;
    
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const mentionJid = ctx?.mentionedJid?.[0];
    const quotedPart = ctx?.participant;
    
    const target = mentionJid || quotedPart;
    
    if (!target || target === sender) {
      return sock.sendMessage(jid, {
        text: "💥 *Dragon Ball Battle*\n\nUsage: *.dbzbattle @user*\nChallenge another warrior to a duel!"
      }, { quoted: msg });
    }

    const moves = [
      { name: "Kamehameha", power: 80, msg: "fired a massive Kamehameha!" },
      { name: "Galick Gun", power: 75, msg: "charged a powerful Galick Gun!" },
      { name: "Final Flash", power: 90, msg: "unleashed a devastating Final Flash!" },
      { name: "Spirit Bomb", power: 100, msg: "gathered energy for a Spirit Bomb!" },
      { name: "Special Beam Cannon", power: 85, msg: "launched a precise Special Beam Cannon!" },
      { name: "Destructo Disc", power: 70, msg: "threw a sharp Destructo Disc!" }
    ];

    const move = moves[Math.floor(Math.random() * moves.length)];
    const win = Math.random() > 0.5;
    
    const winner = win ? sender : target;
    const loser = win ? target : sender;
    
    const caption = `💥 *DRAGON BALL BATTLE* 💥\n\n` +
      `🔥 *@${sender.split('@')[0]}* ${move.msg}\n` +
      `🛡️ *@${target.split('@')[0]}* tries to block it...\n\n` +
      `🏆 *Winner:* *@${winner.split('@')[0]}*\n` +
      `💀 *Loser:* *@${loser.split('@')[0]}*\n\n` +
      `Power Level: *${Math.floor(Math.random() * 9000) + 1000}*`;

    await sock.sendMessage(jid, {
      text: caption,
      mentions: [sender, target]
    }, { quoted: msg });
  }
};
