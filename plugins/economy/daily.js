import { getUser, saveUser, requireRegistration, checkLevelUp } from "./database.js";
import axios from "axios";

function fmt(n) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toLocaleString()}`;
}

export default {
  name: "daily",
  description: "Claim your daily reward (24-hour cooldown)",
  category: "economy",
  usage: ".daily",
  aliases: ["dailyclaim"],

  async run({ sock, msg, sender }) {
    if (!await requireRegistration(sock, msg, sender)) return;

    const user     = await getUser(sender);
    const now      = Date.now();
    const cooldown = 24 * 60 * 60 * 1000;
    const jid      = msg.key.remoteJid;

    // Default values if streak isn't yet set on user
    const streak = user.streak || 1;
    const streakBonus = 300;

    // Fetch the image as a Buffer so WhatsApp can render it
    let imageBuffer = null;
    try {
      const response = await axios.get(
        "https://cdn.phototourl.com/free/2026-09-09-624701fe-635a-4c28-af32-c73503b0186c.jpg",
        { responseType: "arraybuffer" }
      );
      imageBuffer = Buffer.from(response.data, "binary");
    } catch (err) {
      console.error("Failed to fetch link preview image:", err);
    }

    // Link preview configuration with Buffer payload
    const linkPreviewConfig = {
      "canonical-url": "https://aidoru.zone.id/daily",
      "matched-text": "https://aidoru.zone.id/daily",
      title: "aidoru daily reward",
      body: "Maintain your streak and claim exclusive daily rewards, coins, and bonuses!",
      description: "aidoru daily reward",
      jpegThumbnail: imageBuffer,
      renderLargerThumbnail: true // Forces WhatsApp to render the large image card
    };

    if (now - (user.lastDaily || 0) < cooldown) {
      const remaining = cooldown - (now - user.lastDaily);
      const hours     = Math.floor(remaining / (60 * 60 * 1000));
      const minutes   = Math.floor((remaining % (60 * 60 * 1000)) / (60 * 1000));

      const limitCaption =
`⏳ You've already claimed your daily reward today! Next claim available in ${hours}h ${minutes}m.

You can collect more daily reward here: https://aidoru.zone.id/daily`;

      return sock.sendMessage(
        jid, 
        { 
          text: limitCaption,
          linkPreview: linkPreviewConfig
        }, 
        { quoted: msg }
      );
    }

    const reward   = 50000 + Math.floor(Math.random() * 50000);
    const xpBonus  = 200;

    user.money    += (reward + streakBonus);
    user.lastDaily = now;
    user.xp        = (user.xp || 0) + xpBonus;

    const { leveled, newLevel } = checkLevelUp(user);

    await saveUser(sender, user);

    const claimCaption =
`🎉 You've claimed your daily reward of ${fmt(reward)} coins + ${streakBonus} streak bonus (streak: ${streak})! Your new balance is ${fmt(user.money)} coins.${leveled ? `\n\n⭐ *LEVEL UP!* You are now Level ${newLevel}!` : ""}

You can collect more daily reward here: https://aidoru.zone.id/daily`;

    await sock.sendMessage(
      jid, 
      { 
        text: claimCaption,
        linkPreview: linkPreviewConfig
      }, 
      { quoted: msg }
    );
  },
};
