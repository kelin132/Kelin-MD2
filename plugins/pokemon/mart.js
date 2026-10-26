import { buildEconomyLinkPreview, getEconomyPreviewConfig } from "../../lib/economyPreview.mjs";

export default {
  name: "mart",
  aliases: ["pokemart", "pokeshop"],
  description: "Open the Pokémon Mart on AIDORU",
  category: "pokemon",
  usage: ".mart",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid || msg.key.participant;
    if (!jid) return;

    const config = getEconomyPreviewConfig("mart");
    if (!config) return;
    const text = "🏪 *AIDORU POKÉMON MART*\n\nBuy online:\n" + config.url;

    try {
      const linkPreview = await buildEconomyLinkPreview("mart");
      return await sock.sendMessage(jid, { text, linkPreview }, { quoted: msg });
    } catch (error) {
      console.warn("[mart] website preview failed; sending text fallback:", error?.message || error);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
  },
};
