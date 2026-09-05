export default {
  name: "guildhelp",
  description: "Show all guild commands",
  category: "guild",
  usage: ".guildhelp",
  aliases: ["ghelp"],
  cooldown: 5,

  async run({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, {
      text:
`┌─〔 🏰 *𝐆𝐔𝐈𝐋𝐃 𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒* 〕
├◆ .addmember      | .createguild
├◆ .guildcomp      | .guildhelp
├◆ .guildlist      | .guildmembers
├◆ .guildrank      | .guildtax
├◆ .guildupgrade   | .joinguild
├◆ .leaveguild     | .myguild
├◆ .removemember   | .setguilddesc
├◆ .setguildicon   | .setguildname
└───────────────◆

📋 *DETAILS:*

🏰 *Guild Management*
  .createguild <name>       — Create a new guild
  .setguildname <name>      — Rename your guild
  .setguilddesc <text>      — Set your guild description
  .setguildicon <url>       — Set your anime guild icon

👥 *Membership*
  .addmember @user          — Add a member (owner only)
  .removemember @user       — Remove a member (owner only)
  .joinguild <name>         — Join an existing guild
  .guildmembers [name]      — List every member by name
  .leaveguild               — Leave your current guild

📈 *Progression & Treasury*
  .guildtax <name> [amount] — Pay a level-scaled guild contribution
  .guildupgrade <name>      — Upgrade when treasury, XP and member goals are met
  .myguild                  — View level, tax, XP and upgrade progress

📊 *Info & Rankings*
  .guildlist                — Browse all guilds
  .guildrank                — Guild leaderboard (top 10)
  .guildcomp G1 | G2        — Compare two guilds head-to-head

💡 Guild work comes from member contributions. Higher levels unlock larger member capacity and a higher guild tax rate.`
    }, { quoted: msg });
  }
};
