// Background editing is intentionally website-only.
import sendLinkPreview from "../../lib/linkPreview.mjs";

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
    const targetUrl = "https://aidoru.zone.id/profile";
    return sendLinkPreview(sock, jid, targetUrl, {
      title: "AIDORU Profile Backgrounds",
      body: "Edit your profile background on AIDORU Community",
      text: `🎨 Profile backgrounds are now managed on AIDORU only.\n\nOpen ${targetUrl} to edit your background; your choice will be used here by *.profile*.`,
      fallbackText: `🎨 Profile backgrounds are now managed on AIDORU only.\n\nOpen ${targetUrl} to edit your background; your choice will be used here by *.profile*.`,
      quoted: msg,
    });
  },
};
