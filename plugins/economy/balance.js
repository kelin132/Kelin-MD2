import { readFile } from "node:fs/promises";
import { getUser, requireRegistration } from "./database.js";
import { formatAccountBalance } from "./balanceFormat.js";

const BALANCE_PREVIEW_URL = "https://rimuruslime.com";
const BALANCE_PREVIEW_IMAGE = new URL("../../assets/economy-preview-profile.jpg", import.meta.url);
let balanceThumbnailPromise;

function getBalanceThumbnail() {
  if (!balanceThumbnailPromise) {
    balanceThumbnailPromise = readFile(BALANCE_PREVIEW_IMAGE).catch(() => null);
  }
  return balanceThumbnailPromise;
}

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
    }) + `\n\n${BALANCE_PREVIEW_URL}`;

    const linkPreview = {
      "canonical-url": BALANCE_PREVIEW_URL,
      "matched-text": BALANCE_PREVIEW_URL,
      title: "Kami Sama",
      description: "Balance",
      jpegThumbnail: await getBalanceThumbnail(),
    };

    try {
      await sock.sendMessage(jid, { text, mentions: [sender], linkPreview }, { quoted: msg });
    } catch (error) {
      console.warn("[balance] link preview failed; sending text fallback:", error?.message || error);
      await sock.sendMessage(jid, { text, mentions: [sender] }, { quoted: msg });
    }
  },
};
