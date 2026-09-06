import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

const AIDORU_WEBSITE_URL = "https://aidoru.zone.id";
const AIDORU_IMAGE_URL =
  "https://raw.githubusercontent.com/kelin132/AKIRA-DISCORD/main/assets/aidoru-menu.png";

export function createAidoruOnboardingPayload(member) {
  const userId = String(member?.id || "");
  const displayName = member?.displayName || member?.user?.username || "friend";
  const mention = userId ? `<@${userId}>` : `**${displayName}**`;

  const embed = new EmbedBuilder()
    .setColor("#A970FF")
    .setTitle("✦ Welcome to AIDORU")
    .setDescription([
      `Welcome to **AIDORU**, ${mention}!`,
      "",
      "AIDORU connects your Discord experience to the anime-powered trainer world.",
      "Already have a WhatsApp trainer? Link it. Never? Register your AIDORU account.",
    ].join("\n"))
    .setThumbnail(AIDORU_IMAGE_URL)
    .setFooter({ text: "✦ AIDORU • AKIRA" });

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel("Link")
      .setEmoji("🔗")
      .setStyle(ButtonStyle.Link)
      .setURL(AIDORU_WEBSITE_URL),
    new ButtonBuilder()
      .setLabel("Register")
      .setEmoji("📝")
      .setStyle(ButtonStyle.Link)
      .setURL(AIDORU_WEBSITE_URL),
  );

  const payload = {
    embeds: [embed],
    components: [buttons],
  };
  if (userId) {
    payload.allowedMentions = { users: [userId] };
  }
  return payload;
}

export { AIDORU_WEBSITE_URL };