import { buildEconomyLinkPreview, getEconomyPreviewConfig } from "../../lib/economyPreview.mjs";

export default {
  name: "shop",
  aliases: ["store", "market"],
  description: "Open the AIDORU Shop on the website",
  category: "economy",
  usage: ".shop",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid || msg.key.participant;
    if (!jid) return;

    const config = getEconomyPreviewConfig("shop");
    if (!config) return;
    const text = "🛒 *AIDORU SHOP*\n\nBuy online:\n" + config.url;

    try {
      const linkPreview = await buildEconomyLinkPreview("shop");
      return await sock.sendMessage(jid, { text, linkPreview }, { quoted: msg });
    } catch (error) {
      console.warn("[shop] website preview failed; sending text fallback:", error?.message || error);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
  },
};
