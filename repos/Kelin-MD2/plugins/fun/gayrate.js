export default {
  name: "gayrate",
  aliases: ["gay"],
  category: "fun",
  description: "Check how gay someone is",
  usage: ".gayrate [@user]",

  async run({ sock, msg, sender, args }) {
    const jid = msg.key.remoteJid;
    
    // Resolve target: mentioned user, replied user, or the sender themselves
    let target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0] || 
                 msg.message?.extendedTextMessage?.contextInfo?.participant || 
                 sender;
    
    const rate = Math.floor(Math.random() * 101);
    const bar = "🏳️‍🌈".repeat(Math.floor(rate / 10)) + "⚪".repeat(10 - Math.floor(rate / 10));
    
    let comment = "";
    if (rate < 20) comment = "You're pretty straight! 🗿";
    else if (rate < 50) comment = "Just a little bit curious? 👀";
    else if (rate < 80) comment = "Definitely part of the squad! ✨";
    else if (rate < 100) comment = "Ultra Gay! 🌈🔥";
    else comment = "100% GAY LORD! 👑🏳️‍🌈";

    const text = `╭─〔 🏳️‍🌈 *𝐆𝐀𝐘 𝐑𝐀𝐓𝐄* 〕
├◆ *Target* :: @${target.split("@")[0]}
├◆ *Rate*   :: *${rate}%*
├◆ *Status* :: ${bar}
│
├◆ _${comment}_
└───────────────◆`;

    return sock.sendMessage(jid, { 
      text, 
      mentions: [target] 
    }, { quoted: msg });
  },
};
