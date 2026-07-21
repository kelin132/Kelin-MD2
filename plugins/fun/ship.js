// plugins/fun/ship.js
// .ship @user1 @user2 (or .ship @user to ship with yourself)
export default {
  name: "ship",
  description: "Check compatibility between two users",
  category: "fun",
  usage: ".ship @user1 [@user2]",
  aliases: ["compatibility", "lovemeter"],
  cooldown: 3,

  async run({ sock, msg }) {
    const jid      = msg.key.remoteJid;
    const sender   = msg.key.participant || msg.key.remoteJid;
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];

    let userA, userB;

    if (mentions.length >= 2) {
      [userA, userB] = mentions;
    } else if (mentions.length === 1) {
      userA = sender;
      userB = mentions[0];
    } else {
      return sock.sendMessage(jid, {
        text: `💕 *SHIP*\n\nUsage:\n• *.ship @user* — ship yourself with someone\n• *.ship @user1 @user2* — ship two people`,
      }, { quoted: msg });
    }

    const numA = userA.split("@")[0].split(":")[0];
    const numB = userB.split("@")[0].split(":")[0];

    // Deterministic score based on JID pair (consistent across calls)
    const seed  = [...`${[numA, numB].sort().join("")}`].reduce((s, c) => s + c.charCodeAt(0), 0);
    const score = seed % 101; // 0–100

    const bar  = "❤️".repeat(Math.round(score / 10)) + "🖤".repeat(10 - Math.round(score / 10));

    let verdict;
    if (score >= 90)      verdict = "💍 Soulmates! Marry already!";
    else if (score >= 75) verdict = "😍 Perfect match!";
    else if (score >= 60) verdict = "💕 Great chemistry!";
    else if (score >= 45) verdict = "🙂 Compatible enough!";
    else if (score >= 30) verdict = "😬 It's... complicated.";
    else if (score >= 15) verdict = "😅 Probably just friends.";
    else                  verdict = "💀 Total disaster. Never.";

    return sock.sendMessage(jid, {
      text: [
        `💘 *SHIP METER*`,
        ``,
        `👤 @${numA}`,
        `❤️ +`,
        `👤 @${numB}`,
        ``,
        `${bar}`,
        `💯 Score: *${score}%*`,
        ``,
        verdict,
      ].join("\n"),
      mentions: [userA, userB],
    }, { quoted: msg });
  },
};
