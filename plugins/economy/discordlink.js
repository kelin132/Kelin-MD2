import { isRegistered } from "./database.js";
import { createWhatsAppLinkCode } from "../../lib/accountLink.mjs";
import { getDatabaseId } from "../../lib/identity.mjs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const AIDORU_DISCORD_INVITE =
  process.env.AIDORU_DISCORD_INVITE || "https://discord.gg/6JxSaR3va";
const PREVIEW_IMAGE_URL = new URL("../../assets/aidoru-web-preview.jpg", import.meta.url);

export default {
  name: "discord",
  description: "Join the official AIDORU Discord server or link your account",
  category: "economy",
  usage: ".discord",
  aliases: ["discordlink", "linkdiscord"],
  cooldown: 10,

  async run({ sock, msg, sender }) {
    const previewThumbnail = await readFile(fileURLToPath(PREVIEW_IMAGE_URL)).catch(() => null);
    const whatsappId = await getDatabaseId(sender, sock, msg.key.remoteJid);
    if (!await isRegistered(whatsappId)) {
      return sock.sendMessage(msg.key.remoteJid, {
        text: `🌸 *Official AIDORU Discord*

Join the community here:
${AIDORU_DISCORD_INVITE}

Have fun`,
        linkPreview: {
          "canonical-url": AIDORU_DISCORD_INVITE,
          "matched-text": AIDORU_DISCORD_INVITE,
          title: "🌸 Official AIDORU Discord Server",
          description: "Join AIDORU on Discord for community events, games, Pokémon, cards, and bot support.",
          jpegThumbnail: previewThumbnail,
        },
      }, { quoted: msg });
    }

    const { code } = await createWhatsAppLinkCode(whatsappId);
    return sock.sendMessage(msg.key.remoteJid, {
      text: [
        "🌸 *Official AIDORU Discord Server*",
        "",
        `Join here: ${AIDORU_DISCORD_INVITE}`,
        "",
      ].join("\n"),
      linkPreview: {
        "canonical-url": AIDORU_DISCORD_INVITE,
        "matched-text": AIDORU_DISCORD_INVITE,
        title: "🌸 Official AIDORU Discord Server",
        description: "Join AIDORU on Discord for community events, games, Pokémon, cards, and bot support.",
        jpegThumbnail: previewThumbnail,
      },
    }, { quoted: msg });
  },
};