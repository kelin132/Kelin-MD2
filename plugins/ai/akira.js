/**
 * KELIN MD — legacy persona command metadata.
 * The active persona auto-responds when its name is mentioned or it is tagged.
 * This hidden compatibility plugin is kept for older installations.
 */
import {
  getActivePersona,
  getPersonaTriggerNames,
} from "../../lib/aiPersonas.mjs";
import { resetPersonaSession } from "../../lib/akiraAI.mjs";

export default {
  name: "akira",
  description: "Chat with the active AI persona",
  category: "ai",
  usage: ".akira reset | .akira info",
  aliases: ["ak"],
  cooldown: 5,

  async run({ sock, msg, args }) {
    const persona = getActivePersona();
    if (args[0]?.toLowerCase() === "reset") {
      resetPersonaSession(msg.key.remoteJid);
      return sock.sendMessage(
        msg.key.remoteJid,
        { text: `${persona.displayName}'s conversation has been reset.` },
        { quoted: msg },
      );
    }

    if (args[0]?.toLowerCase() === "info") {
      return sock.sendMessage(
        msg.key.remoteJid,
        {
          text: `Active AI persona: *${persona.displayName}*\nMention ${getPersonaTriggerNames().map((alias) => `*${alias}*`).join(", ")} to get a response.`,
        },
        { quoted: msg },
      );
    }
  }
};
