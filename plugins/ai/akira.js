/**
 * KELIN MD — Akira command plugin
 * DISABLED — Akira now auto-responds when her name is mentioned or she is @tagged.
 * The .akira command is turned off; this file is kept so the reset/info
 * logic is preserved if needed in future.
 */
import { callAkira, resetAkiraSession } from "../../lib/akiraAI.mjs";

export default {
  name: "akira",
  description: "Chat with Akira — your anime girl AI companion",
  category: "ai",
  usage: ".akira <message> | .akira reset | .akira info",
  aliases: ["ak"],
  cooldown: 5,
  hidden: true,  // hidden from all users — command is disabled

  async run({ sock, msg, text, args }) {
    // Command is disabled — Akira responds automatically when mentioned or tagged.
    // Return silently so nothing happens.
    return;
  }
};
