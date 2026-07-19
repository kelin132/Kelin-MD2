/**
 * Shared helper for all anime reaction plugins.
 * Uses native fetch — no axios dependency needed.
 */
import { log } from "../../lib/logger.mjs";

/** Fetch a random GIF/image URL from waifu.pics */
export async function getWaifuPic(type) {
  const res = await fetch(`https://api.waifu.pics/sfw/${type}`);
  if (!res.ok) throw new Error(`waifu.pics error: ${res.status}`);
  const json = await res.json();
  if (!json.url) throw new Error("No URL in response");
  return json.url;
}

/**
 * Send an anime reaction image.
 *
 * @param {object}   opts
 * @param {object}   opts.sock       – Baileys socket
 * @param {object}   opts.msg        – raw WA message
 * @param {object}   opts.sender     – sender JID
 * @param {string}   opts.type       – waifu.pics endpoint (e.g. "hug")
 * @param {string}   opts.soloCaption   – caption when used alone (no mention)
 * @param {Function} opts.duoCaption    – (senderTag, targetTag) => string when @mentioning someone
 * @param {string}   opts.errorText  – text shown on failure
 */
export async function sendReaction({ sock, msg, sender, type, soloCaption, duoCaption, errorText }) {
  const chatId    = msg.key.remoteJid;
  const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];

  const senderTag = `@${sender.split("@")[0].split(":")[0]}`;
  const targetTag = mentioned ? `@${mentioned.split("@")[0].split(":")[0]}` : null;
  const mentions  = mentioned ? [sender, mentioned] : [sender];

  const caption = (mentioned && duoCaption)
    ? duoCaption(senderTag, targetTag)
    : soloCaption;

  try {
    const url = await getWaifuPic(type);
    await sock.sendMessage(chatId, {
      image: { url },
      caption,
      mentions,
    }, { quoted: msg });
  } catch (err) {
    log("warn", `[anime/${type}] ${err.message}`);
    await sock.sendMessage(chatId, { text: errorText }, { quoted: msg });
  }
}
