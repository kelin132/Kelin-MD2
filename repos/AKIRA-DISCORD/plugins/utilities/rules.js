export default {
  name: "rules",
  description: "View the official AIDORU server rules",
  category: "main",
  usage: ".rules",
  aliases: ["botrules", "terms"],
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",

  async run({ sock, msg, discord }) {
    try {
      const jid = msg.key.remoteJid;
      const animatedEmoji = discord?.client?.emojis?.cache?.find?.(
        (emoji) => emoji.animated && /sparkle|star|heart|cute|pink|aiko|aidoru/i.test(emoji.name || ""),
      );
      const motion = animatedEmoji
        ? `<a:${animatedEmoji.name}:${animatedEmoji.id}>`
        : "✨";

      if (discord?.message) {
        await sock.sendMessage(jid, {
          discordEmbed: {
            title: `${motion} 𝐀𝐈𝐃𝐎𝐑𝐔 𝐒𝐄𝐑𝐕𝐄𝐑 𝐑𝐔𝐋𝐄𝐒 ${motion}`,
            description: [
              `**Welcome to AIDORU!** ${motion}`,
              "",
              "Keep our little anime corner safe, friendly, and fun for everyone.",
              "By staying here, you agree to follow these guidelines.",
            ].join("\n"),
            color: "#FF4FA3",
            fields: [
              {
                name: `${motion} 01 · Be kind`,
                value: "Respect members, staff, and creators. No harassment, bullying, hate speech, or impersonation.",
                inline: false,
              },
              {
                name: `${motion} 02 · Keep it safe`,
                value: "No illegal activity, threats, doxxing, scams, malicious links, or attempts to exploit the bot.",
                inline: false,
              },
              {
                name: `${motion} 03 · Keep channels clean`,
                value: "No spam, command flooding, raids, or disruptive content. Use commands in the right channels.",
                inline: false,
              },
              {
                name: `${motion} 04 · Content boundaries`,
                value: "No NSFW, graphic, hateful, or offensive content. Keep usernames, profiles, and uploads appropriate.",
                inline: false,
              },
              {
                name: `${motion} 05 · Use AIDORU fairly`,
                value: "Do not abuse bugs, automate gameplay, exploit rewards, or impersonate the bot. Report issues with `.support`.",
                inline: false,
              },
              {
                name: `${motion} 06 · Staff decisions`,
                value: "Staff may remove content, restrict access, or blacklist accounts when needed to protect the community.",
                inline: false,
              },
            ],
            footer: {
              text: `${motion} Read the rules • Have fun • AIDORU · AKIRA`,
            },
          },
        }, { quoted: msg });
        return;
      }

      const rulesMessage = `
╭━━━〔 📜 AKIRA RULES 〕━━━╮

🌸 Welcome to AKIRA MD!

Before using the bot, please follow these rules:

1️⃣ Do not spam commands.
2️⃣ Do not abuse or exploit bot bugs.
3️⃣ Do not use the bot for illegal activities.
4️⃣ Respect other users and group members.
5️⃣ NSFW or offensive content is not allowed.
6️⃣ Do not modify or impersonate the bot.
7️⃣ The owner may blacklist users who abuse the bot.
8️⃣ Premium features are for premium users only.
9️⃣ If the bot is offline, please be patient.
🔟 Report bugs using the *.support* command.

━━━━━━━━━━━━━━━━━━━
⚠️ Breaking these rules may result in:
• Temporary blacklist
• Permanent blacklist
• Removal from support groups

🌸 Thank you for using AKIRA-MD!
⚔️ Enjoy your anime adventure!

╰━━━━━━━━━━━━━━━━━━━╯
`;

      await sock.sendMessage(jid, { text: rulesMessage }, { quoted: msg });

    } catch (err) {
      console.error(err);

      if (discord?.message) {
        await sock.sendMessage(jid, {
          discordEmbed: {
            title: "❌ AIDORU Rules",
            description: "The rules could not be displayed right now. Please try `.rules` again.",
            color: "#FF5D73",
            footer: { text: "AIDORU • AKIRA" },
          },
        }, { quoted: msg });
      } else {
        await sock.sendMessage(
          jid,
          { text: "❌ Failed to display the bot rules." },
          { quoted: msg },
        );
      }
    }
  }
};