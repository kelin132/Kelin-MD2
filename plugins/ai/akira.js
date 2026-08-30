/**
 * KELIN MD — Akira command plugin
 *
 * Auto-replies are handled by akiraHandler.mjs. This command remains useful
 * for group prompts, group AI controls, and managing the current user's memory.
 */
import {
  callAkira,
  resetAkiraSession,
} from "../../lib/akiraAI.mjs";
import { getAkiraMemory } from "../../lib/akiraMemory.mjs";
import { groupSettings } from "../../lib/groupSettings.js";

export default {
  name: "akira",
  description: "Chat with Akira in groups and control the group AI mode",
  category: "ai",
  usage: ".akira <message> | .akira on | .akira off | .akira status | .akira reset | .akira info",
  aliases: ["ak"],
  cooldown: 5,
  hidden: false,
  isAdmin: true,

  async run({ sock, msg, text, args }) {
    const chatJid = msg.key.remoteJid || "";
    if (!chatJid.endsWith("@g.us")) return;

    const userJid = msg.key.participant || msg.key.remoteJid || "";
    const subcommand = String(args?.[0] || "").toLowerCase();

    if (subcommand === "on" || subcommand === "off") {
      const enabled = subcommand === "on";
      groupSettings.set(chatJid, { akiraEnabled: enabled });
      await sock.sendMessage(
        chatJid,
        {
          text: enabled
            ? "✅ Akira AI is now *ON* in this group.\nMention her, reply to her, or say her name to chat."
            : "✅ Akira AI is now *OFF* in this group.\nUse *.akira on* whenever you want to turn her back on.",
        },
        { quoted: msg }
      );
      return;
    }

    if (subcommand === "status") {
      const enabled = groupSettings.get(chatJid).akiraEnabled !== false;
      await sock.sendMessage(
        chatJid,
        {
          text: `🤖 Akira AI is currently *${enabled ? "ON" : "OFF"}* in this group.\n${
            enabled
              ? "Use *.akira off* to disable her."
              : "Use *.akira on* to enable her."
          }`,
        },
        { quoted: msg }
      );
      return;
    }

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
