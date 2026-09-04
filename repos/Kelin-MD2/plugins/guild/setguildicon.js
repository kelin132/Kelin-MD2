import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { guildSystem } from "../../lib/guildSystem.js";
import { requireRegistration } from "./database.js";
import { generateGuildProfile, getProfilePic, getContactName } from "../../lib/guildGen.mjs";

/**
 * Extract the quoted message context from a WhatsApp message.
 */
function getContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    null
  );
}

/**
 * Unwrap ephemeral / view-once wrapper messages.
 */
function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 4 && current; i++) {
    const wrapped =
      current.ephemeralMessage ||
      current.viewOnceMessage ||
      current.viewOnceMessageV2 ||
      current.viewOnceMessageV2Extension;
    if (!wrapped?.message) break;
    current = wrapped.message;
  }
  return current;
}

/**
 * Download an imageMessage from Baileys and return a base64 data-URL string
 * that can be passed straight into canvas loadImage().
 */
async function downloadImageAsDataUrl(imgMsg) {
  const stream = await downloadContentFromMessage(imgMsg, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buf = Buffer.concat(chunks);
  const mime = imgMsg.mimetype || "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export default {
  name: "setguildicon",
  description: "Set your guild's banner/icon — provide a URL or reply to an image",
  category: "guild",
  usage: ".setguildicon <image_url>  OR  reply to an image with .setguildicon",
  aliases: ["gicon", "gbanner", "guildicon"],
  cooldown: 10,

  async run({ sock, msg, sender, text }) {
    const jid = msg.key.remoteJid;

    if (!await requireRegistration(sock, msg, sender)) return;

    // ── Determine icon source ─────────────────────────────────────────────────
    let iconUrl = text?.trim() || null;

    // If no URL provided, check if the user replied to an image
    if (!iconUrl) {
      const ctx     = getContext(msg);
      const quoted  = unwrapMessage(ctx?.quotedMessage);
      const imgMsg  = quoted?.imageMessage;

      if (imgMsg) {
        // Download the replied image and convert to data URL
        try {
          await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
          iconUrl = await downloadImageAsDataUrl(imgMsg);
        } catch (err) {
          return sock.sendMessage(jid, {
            text: "❌ Failed to download the replied image. Please try sending a direct URL instead."
          }, { quoted: msg });
        }
      }
    }

    // If still no icon source, show usage
    if (!iconUrl) {
      return sock.sendMessage(jid, {
        text:
`╭─〔 🏰 *𝐒𝐄𝐓 𝐈𝐂𝐎𝐍* 〕
│ 📖 *Usage 1* :: *.setguildicon <image_url>*
│ 📖 *Usage 2* :: Reply to an image with *.setguildicon*
│ 💡 The image will fill the full guild banner background
│ ⚠️ Owner only
└───────────────◆`
      }, { quoted: msg });
    }

    // Validate URL (skip check for data URLs from replied images)
    if (!iconUrl.startsWith("data:") &&
        !iconUrl.startsWith("http://") &&
        !iconUrl.startsWith("https://")) {
      return sock.sendMessage(jid, {
        text: "❌ Please provide a valid image URL starting with *http://* or *https://*"
      }, { quoted: msg });
    }

    const guilds = await guildSystem.getUserGuilds(sender);
    const ownedGuild = guilds.find(g => g.owner === sender);

    if (!ownedGuild) {
      return sock.sendMessage(jid, {
        text: "❌ You don't own any guild!\n\nCreate one with *.createguild <name>*"
      }, { quoted: msg });
    }

    const result = await guildSystem.setIcon(ownedGuild.name, sender, iconUrl);

    if (result === "not_owner") {
      return sock.sendMessage(jid, { text: "❌ You are not the owner of this guild." }, { quoted: msg });
    }

    const ownerPic  = await getProfilePic(sock, sender);
    const ownerName = getContactName(sock, sender);

    const caption =
`╭─〔 🏰 *𝐒𝐄𝐓 𝐈𝐂𝐎𝐍* 〕
├◆ *Result* :: *UPDATED 🟢*
├◆ *Guild*  :: *${ownedGuild.name}*
├◆ *Banner* :: Updated! (fills full background)
└───────────────◆`;

    try {
      const updated   = await guildSystem.getGuild(ownedGuild.name);
      const imgBuffer = await generateGuildProfile(
        { name: ownedGuild.name, icon: iconUrl, description: updated.description || "" },
        { name: ownerName, profilePic: ownerPic }
      );
      await sock.sendMessage(jid, { image: imgBuffer, caption }, { quoted: msg });
    } catch {
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
    }
  }
};
