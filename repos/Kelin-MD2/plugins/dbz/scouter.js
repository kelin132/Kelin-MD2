const POWER_NAMES = ["Earthling", "Saiyan", "Namekian", "Android", "Super Saiyan", "Legendary Warrior"];

export default {
  name: "scouter",
  aliases: ["powerlevel", "pl"],
  category: "dbz",
  description: "Scan a fighter’s Dragon Ball power level",
  usage: ".scouter [name]",
  cooldown: 5,

  async run({ sock, msg, args, sender }) {
    const jid = msg.key.remoteJid;
    const target = args.join(" ").replace(/@[^\s]+/g, "").trim() || sender.split("@")[0];
    const power = Math.floor(9_000 + Math.random() * 991_000);
    const title = POWER_NAMES[Math.floor(Math.random() * POWER_NAMES.length)];
    return sock.sendMessage(jid, {
      text: `╭━━〔 🔴 𝐒𝐂𝐎𝐔𝐓𝐄𝐑 〕━━╮\n┃ 👤 Target :: *${target}*\n┃ ⚡ Power  :: *${power.toLocaleString()}*\n┃ 🧬 Class  :: *${title}*\n┃\n┃ > It’s over 9,000... or is it?\n╰━━━━━━━━━━━━━━━━╯`,
    }, { quoted: msg });
  },
};
