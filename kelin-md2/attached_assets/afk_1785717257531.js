const { findOrCreateWhatsApp } = require('../../database/users');

moon({
  name: "afk",
  category: "General",
  description: "Set your AFK status so others know you're away",
  usage: ".afk <reason>",
  aliases: ["away"],
  async execute(sock, jid, sender, args, m, { reply, pushName }) {
    try {
      const reason = args.join(" ").trim() || "No reason provided";

      // Use the User model (whatsappNumber) — this is what handler/afk.js reads from
      const user = await findOrCreateWhatsApp(sender, pushName, true);

      if (!user) return reply("❌ Could not find your profile. Please try again.");

      // If already AFK, update the reason
      const wasAlreadyAfk = user.afk === true;

      user.afk = true;
      user.afkReason = reason;
      user.afkSince = new Date();
      await user.save();

      const name = pushName || sender.split('@')[0];

      if (wasAlreadyAfk) {
        return reply(
`🌙 *AFK Updated*

👤 *User:* ${name}
📝 *New Reason:* ${reason}
⏰ *Timer reset.*`
        );
      }

      return reply(
`🌙 *AFK Enabled*

👤 *User:* ${name}
📝 *Reason:* ${reason}
💤 You are now marked as AFK.

_The bot will notify others if they tag you._`
      );

    } catch (err) {
      console.error("[AFK CMD ERROR]", err);
      return reply("❌ Failed to set AFK. Please try again.");
    }
  }
});
