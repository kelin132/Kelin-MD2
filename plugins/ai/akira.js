/**
 * KELIN MD — Akira command plugin
 *
 * Auto-replies are handled by akiraHandler.mjs. This command remains useful
 * for private prompts and for managing the current user's memory.
 */
import {
  callAkira,
  resetAkiraSession,
} from "../../lib/akiraAI.mjs";
import { getAkiraMemory } from "../../lib/akiraMemory.mjs";

export default {
  name: "akira",
  description: "Chat with Akira — a short, mixed-personality anime girl companion",
  category: "ai",
  usage: ".akira <message> | .akira reset | .akira info",
  aliases: ["ak"],
  cooldown: 5,
  hidden: false,

  async run({ sock, msg, text, args }) {
    const userJid = msg.key.participant || msg.key.remoteJid || "";
    const subcommand = String(args?.[0] || "").toLowerCase();

    if (subcommand === "reset") {
      await resetAkiraSession(userJid);
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "memory cleared. fresh start, nee~" },
        { quoted: msg }
      );
      return;
    }

    if (subcommand === "info") {
      const memory = await getAkiraMemory(userJid, msg.pushName || "");
      await sock.sendMessage(
        msg.key.remoteJid,
        {
          text: [
            `Akira remembers ${memory.messageCount} message${memory.messageCount === 1 ? "" : "s"} from you.`,
            memory.name ? `Name saved: ${memory.name}` : "I don't have your name saved yet.",
            "Use *.akira reset* if you want me to forget this conversation.",
          ].join("\n"),
        },
        { quoted: msg }
      );
      return;
    }

    const prompt = String(text || "").trim();
    if (!prompt) {
      await sock.sendMessage(
        msg.key.remoteJid,
        { text: "oi, say something first~" },
        { quoted: msg }
      );
      return;
    }

    await callAkira(sock, msg, prompt);
  }
};
