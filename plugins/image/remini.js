/**
 * .remini — enhance a replied image with PrinceTech Remini.
 *
 * It also accepts a direct public image URL:
 *   .remini https://example.com/photo.jpg
 */
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { princeApiJson } from "../../lib/princeAPI.mjs";
import { uploadImageForProcessing } from "../../lib/imageUpload.mjs";

function getQuotedImage(msg) {
  const context =
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.videoMessage?.contextInfo ||
    null;

  return {
    image: context?.quotedMessage?.imageMessage ||
      context?.quotedMessage?.viewOnceMessageV2?.message?.imageMessage ||
      null,
    ownImage: msg.message?.imageMessage || null,
  };
}

function pickResultUrl(data) {
  const result = data?.result;
  if (result?.success === false) {
    throw new Error(result.error || result.message || "Remini could not process the image");
  }

  const candidates = [
    result,
    result?.url,
    result?.image,
    result?.image_url,
    result?.imageUrl,
    result?.download_url,
    result?.downloadUrl,
    result?.output,
    data?.data,
    data?.url,
    data?.image,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.startsWith("http")) {
      return candidate;
    }
    if (typeof candidate === "string" && candidate.startsWith("data:image/")) {
      return candidate;
    }
  }

  throw new Error("Remini returned no enhanced image");
}

async function downloadImage(image) {
  const response = await fetch(image, {
    signal: AbortSignal.timeout(90_000),
  });
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.startsWith("image/")) {
    throw new Error("Remini returned an invalid image");
  }
  return Buffer.from(await response.arrayBuffer());
}

function dataUriToBuffer(value) {
  const match = /^data:image\/[^;]+;base64,(.+)$/i.exec(value);
  return match ? Buffer.from(match[1], "base64") : null;
}

export default {
  name: "remini",
  aliases: ["enhance", "enhancer", "upscale"],
  description: "Enhance an image with Remini",
  category: "image",
  usage: ".remini (reply to an image or provide an image URL)",
  cooldown: 15,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const { image: quotedImage, ownImage } = getQuotedImage(msg);
    const directUrl = text?.trim();

    if (!quotedImage && !ownImage && !directUrl) {
      return sock.sendMessage(jid, {
        text:
          "✨ *Remini Image Enhancer*\n\n" +
          "Reply to an image and send *.remini*, or use:\n" +
          "*.remini https://example.com/image.jpg*",
      }, { quoted: msg });
    }

    await sock.sendMessage(jid, { react: { text: "⏳", key: msg.key } });
    await sock.sendPresenceUpdate("composing", jid);

    try {
      let sourceUrl = directUrl;
      if (!sourceUrl) {
        const imageMessage = quotedImage || ownImage;
        const stream = await downloadContentFromMessage(imageMessage, "image");
        const chunks = [];
        for await (const chunk of stream) chunks.push(chunk);
        const buffer = Buffer.concat(chunks);
        const mimetype = imageMessage.mimetype || "image/jpeg";
        const extension = mimetype.split("/")[1]?.split(";")[0] || "jpg";
        sourceUrl = await uploadImageForProcessing(buffer, {
          filename: `remini-input.${extension}`,
          mimetype,
        });
      }

      const data = await princeApiJson(
        "tools/remini",
        { url: sourceUrl },
        120_000,
      );
      const result = pickResultUrl(data);
      const enhanced = dataUriToBuffer(result) || await downloadImage(result);

      await sock.sendMessage(jid, {
        image: enhanced,
        caption: "✨ *Remini Enhancement*\n\nEnhanced successfully.",
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } });
    } catch (err) {
      console.error("[remini]", err?.message);
      await sock.sendMessage(jid, {
        text: `❌ Remini enhancement failed: ${err.message}\n\nReply to a clear image and try again.`,
      }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } });
    } finally {
      await sock.sendPresenceUpdate("paused", jid);
    }
  },
};