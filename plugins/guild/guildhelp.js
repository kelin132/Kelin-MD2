export default {
  name: "guildhelp",
  description: "Show all guild commands",
  category: "guild",
  usage: ".guildhelp",
  aliases: ["ghelp"],
  cooldown: 5,

  async run({ sock, msg, prefix }) {
    const p = prefix || ".";
    await sock.sendMessage(msg.key.remoteJid, {
      text:
`╭━━━〔 ⚔️ GUILD COMMANDS 〕━━━╮

📋 *GENERAL:*
  ${p}createguild <name>    — Create a guild
  ${p}myguilds              — Your guilds
  ${p}allguilds             — All guilds
  ${p}guildinfo <name>      — Guild details

👥 *MANAGEMENT:*
  ${p}guildinvite <g> @user — Invite member
  ${p}guildkick <g> @user   — Remove member

💰 *TREASURY:*
  ${p}guildtax <g> <amount> — Donate to treasury
  ${p}guildupgrade <name>   — Upgrade guild level

📊 *LEVELING:*
  Each level costs (level × $5,000) from treasury.

╰━━━━━━━━━━━━━━━━━━━━━╯`
    }, { quoted: msg });
  }
};
