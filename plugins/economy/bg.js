// Background editing is intentionally website-only.
// Keep this handler as a compatibility response for users who still type .bg.
export default {
  name: "profile-background-web-only",
  aliases: [],
  category: "economy",
  hidden: true,
  cooldown: 5,
  description: "Profile backgrounds are managed on the AIDORU website",
  usage: ".bg",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid;
    return sock.sendMessage(
      jid,
      {
        text: "🎨 Profile backgrounds are now managed on AIDORU only.\n\nOpen https://aidoru.zone.id/profile to edit your background; your choice will be used here by *.profile*.",
      },
      { quoted: msg },
    );
  },
};
