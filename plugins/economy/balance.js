import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";

export default {
  name: "balance",
  description: "Check your wallet and bank balance",
  category: "economy",
  usage: ".balance",
  aliases: ["bal", "money", "wallet"],
  cooldown: 6,

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user = await getUser(sender);
    const jid  = msg.key.remoteJid;
    const text = formatAccountBalance({
      wallet: user.money,
      bank: user.bank,
      gems: user.diamonds,
      footerLines: ["Use .ebal", "for account breakdown"],
    });

    // Website-linked accounts use the profile picture synced from AIDORU/WhatsApp.
    // Keep the preview URL-only so `.bal` remains fast and WhatsApp fetches the image.
    const profileImage = [
      user.profilePictureUrl,
      user.profileImage,
      user.avatarUrl,
      user.profilePic,
      user.pfp,
    ].find((value) => typeof value === "string" && /^https?:\/\//i.test(value.trim()));
    const websiteProfile = user.websiteId || user.websiteVerifiedAt;
    const thumbnailUrl = profileImage || `https://api.dicebear.com/9.x/thumbs/png?seed=${encodeURIComponent(user.name || sender)}`;
    const profileUrl = websiteProfile
      ? `https://aidoru.zone.id/?profile=${encodeURIComponent(String(user.websiteId || sender))}`
      : "https://aidoru.zone.id/";

    await sock.sendMessage(jid, {
      text,
      mentions: [sender],
      contextInfo: {
        externalAdReply: {
          title: user.name ? `${user.name} · AIDORU Account` : "AIDORU Account",
          body: websiteProfile ? "Balance · AIDORU Community profile" : "Balance · Join AIDORU Community",
          sourceUrl: profileUrl,
          thumbnailUrl,
          mediaType: 1,
          renderLargerThumbnail: true,
          showAdAttribution: false,
        },
      },
    }, { quoted: msg });
  },
};
