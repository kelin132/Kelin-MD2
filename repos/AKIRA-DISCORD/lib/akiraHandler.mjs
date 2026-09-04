/**
 * AKIRA DISCORD — Akira auto-trigger handler
 * Fires when someone:
 *   1. Mentions the bot
 *   2. Replies to any message sent by the bot
 *   3. Writes "akira" anywhere in the message
 *
 * Skips commands (prefix-leading messages).
 */
import { callAkira } from "./akiraAI.mjs";

/**
 * @param {object} params
 * @param {object} params.client  – Discord.js client
 * @param {object} params.message – Discord.js message object
 * @param {string} params.prefix  – bot command prefix
 */
export async function akiraHandler({ client, message, prefix = "." }) {
  // ── Never respond to the bot's own messages ──────
  if (message.author.bot) return;

  const body = message.content;
  if (!body.trim()) return;

  // ── Skip commands ────────────────────────────────
  if (body.startsWith(prefix)) return;

  const isMentioned = message.mentions.has(client.user);
  const containsName = body.toLowerCase().includes("akira");
  
  let isReplyToBot = false;
  if (message.reference) {
    try {
      const quoted = await message.fetchReference();
      isReplyToBot = quoted.author.id === client.user.id;
    } catch (err) {
      // Reference might be deleted or inaccessible
    }
  }

  if (!isMentioned && !isReplyToBot && !containsName) return;

  // ── Clean text: strip mention tags before sending to AI ─────────────────
  const cleanText = body
    .replace(/<@!?\d+>/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // Create a mock Baileys-style message object for compatibility with callAkira
  const mockMsg = {
    key: {
      remoteJid: message.channel.id,
      participant: message.author.id,
      fromMe: false,
    },
    pushName: message.author.username,
    message: {
      conversation: cleanText,
    },
    // Add Discord-specific context for the adapter
    discord: {
      message,
      channel: message.channel,
      author: message.author,
    }
  };

  // Mock sock for compatibility
  const mockSock = {
    user: {
      id: client.user.id,
      name: client.user.username,
    },
    sendMessage: async (jid, content, options = {}) => {
      // Handled by adapted callAkira/sendReactionSticker
    }
  };

  await callAkira(
    mockSock,
    mockMsg,
    cleanText || "You were just called by name. Greet the user naturally and ask what is up."
  );
}
