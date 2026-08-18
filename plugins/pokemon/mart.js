import { buildEconomyLinkPreview, getEconomyPreviewConfig } from "../../lib/economyPreview.mjs";

export default {
  name: "mart",
  aliases: ["pokemart", "shop", "pokeshop"],
  description: "Open the Pokémon Mart on AIDORU",
  category: "pokemon",
  usage: ".mart",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid || msg.key.participant;
    if (!jid) return;

    const config = getEconomyPreviewConfig("mart");
    const text = `🏪 *AIDORU POKÉMON MART*

Vist the mart on the website to make your purchases.💠

🔗 ${config.url}`;
    const linkPreview = await buildEconomyLinkPreview("mart");

    try {
      return await sock.sendMessage(jid, { text, linkPreview }, { quoted: msg });
    } catch (error) {
      console.warn("[mart] website preview failed; sending text fallback:", error?.message || error);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
  },
};
