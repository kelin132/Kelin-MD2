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
├◆ !addmember   | !createguild  | !guildcomp
├◆ !guildlist   | !guildrank    | !joinguild
├◆ !leaveguild  | !myguild      | !removemember
├◆ !setguilddesc | !setguildicon | !setguildname
└───────────────◆

📋 *DETAILS:*

🏰 *Guild Management*
  !createguild <name>    — Create a new guild
  !setguildname <name>   — Rename your guild
  !setguilddesc <text>   — Set guild description
  !setguildicon <url>    — Set guild banner image

👥 *Membership*
  !addmember @user       — Add a member (owner only)
  !removemember @user    — Remove a member (owner only)
  !joinguild <name>      — Join an existing guild
  !leaveguild            — Leave your current guild

📊 *Info & Rankings*
  !myguild               — View your guild profile
  !guildlist             — Browse all guilds
  !guildrank             — Guild leaderboard (top 10)
  !guildcomp G1 | G2     — Compare two guilds head-to-head`
    }, { quoted: msg });
  }
};
