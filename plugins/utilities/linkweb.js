/**
 * .linkweb
 *
 * Creates a short-lived, one-time code for linking the sender's existing
 * Kelin MD player profile to Kelin Hub.
 */
import { isRegistered } from "../economy/database.js";
import {
  createWebLinkCode,
  findRegisteredWebIdentity,
  WEB_LINK_CODE_TTL_MS,
} from "../../lib/webLink.mjs";
import { phoneJid } from "../../lib/whatsappIdentity.mjs";

const minutes = Math.floor(WEB_LINK_CODE_TTL_MS / 60_000);

export default {
  name: "linkweb",
  description: "Create a one-time code to link your player profile to Kelin Hub",
  category: "utilities",
  usage: ".linkweb",
  cooldown: 15,

  async run({ sock, msg, sender, phoneNumber, formattedNumber, identity }) {
    const chatId = msg.key.remoteJid;
    const identityCandidates = [
      sender,
      ...(identity?.aliases || []),
      msg.key.participant,
      msg.key.participantAlt,
      msg.key.participantPn,
      msg.key.remoteJid,
      msg.key.remoteJidAlt,
    ].filter(Boolean);
    const registeredJid = await findRegisteredWebIdentity(identityCandidates);

    if (!phoneNumber) {
      return sock.sendMessage(chatId, {
        text: "❌ WhatsApp did not provide a real phone number for this message. Please send *.linkweb* again from your private chat.",
      }, { quoted: msg });
    }

    if (!registeredJid && !await isRegistered(sender)) {
      return sock.sendMessage(chatId, {
        text: "❌ You need to register first.\n\nUse *.register <your_name>*, then run *.linkweb* again.",
      }, { quoted: msg });
    }

    try {
      const canonicalJid = phoneJid(phoneNumber);
      const { code } = await createWebLinkCode(
        canonicalJid,
        [registeredJid, sender, ...identityCandidates],
      );
      await sock.sendMessage(chatId, {
        text: [
          "🔐 *KELIN HUB LINK CODE*",
          "",
          `Your code is: *${code}*`,
          "",
          `Use your real WhatsApp number: *${formattedNumber || `+${phoneNumber}`}*.`,
          "Open the Kelin Hub login page and enter this code with your WhatsApp number.",
          `This code expires in ${minutes} minutes and can only be used once.`,
          "",
          "Do not share this code with anyone.",
        ].join("\n"),
      }, { quoted: msg });
    } catch (error) {
      throw new Error(`Could not create a website link code: ${error.message}`);
    }
  },
};