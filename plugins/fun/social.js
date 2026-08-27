import axios from "axios";

const ACTIONS = {
  kiss: { verb: "kissed", emoji: "💋" },
  hug:  { verb: "hugged", emoji: "🫂" },
  slap: { verb: "slapped", emoji: "👋" },
  pat:  { verb: "patted", emoji: "🖐️" },
  lick: { verb: "licked", emoji: "👅" },
  bite: { verb: "bit",    emoji: "🦷" },
};

export default {
  name: "social",
  aliases: Object.keys(ACTIONS),
  category: "fun",
  description: "Perform social actions with anime GIFs",
  usage: ".kiss @user",

  async run({ sock, msg, sender, args, command }) {
    const jid = msg.key.remoteJid;
    const reply = (text) => sock.sendMessage(jid, { text }, { quoted: msg });
    
    const actionKey = command.toLowerCase();
    const action = ACTIONS[actionKey];
    if (!action) return;

    const target = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (!target) return reply(`❌ Mention someone to ${actionKey}!`);
    if (target === sender) return reply(`❌ You can't ${actionKey} yourself!`);

    try {
      const { data } = await axios.get(`https://api.waifu.pics/sfw/${actionKey}`);
      
      const caption = `*@${sender.split("@")[0]}* ${action.verb} *@${target.split("@")[0]}* ${action.emoji}`;

      return sock.sendMessage(jid, {
        video: { url: data.url },
        gifPlayback: true,
        caption,
        mentions: [sender, target]
      }, { quoted: msg });

    } catch (err) {
      return reply("❌ Failed to fetch action GIF.");
    }
  },
};
