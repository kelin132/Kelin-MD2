import { buildEconomyLinkPreview } from "../../lib/economyPreview.mjs";

export default {
  name: "mart",
  aliases: ["pokemart", "shop", "pokeshop"],
  description: "Open the Pokémon Mart on AIDORU",
  category: "pokemon",
  usage: ".mart",

  async run({ sock, msg }) {
    const jid = msg.key.remoteJid || msg.key.participant;
    if (!jid) return;

    const text = `🏪 *AIDORU POKÉMON MART*

Browse Poké Balls, items, evolution stones, and trainer upgrades on the AIDORU website.

✨ Your WhatsApp Mart purchases have moved to the web so your inventory stays synced safely.
🛍️ Tap the preview card to open the Mart.`;
    const linkPreview = await buildEconomyLinkPreview("mart");

    try {
      return await sock.sendMessage(jid, { text, linkPreview }, { quoted: msg });
    } catch (error) {
      console.warn("[mart] website preview failed; sending text fallback:", error?.message || error);
      return sock.sendMessage(jid, { text }, { quoted: msg });
    }
  },
};
