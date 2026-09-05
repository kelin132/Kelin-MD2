/**
 * Owner bot configuration.
 *
 * .botconfig                         — show current settings
 * .botconfig owner <number>          — change owner number
 * .botconfig name <name>             — change bot name
 * .botconfig image <https://...>     — change menu/bot image
 * .botconfig prefix <prefix>         — change command prefix
 * .botconfig layout <1-4>            — choose a menu layout
 */
import { getRuntimeSettings, updateRuntimeSetting } from "../../lib/runtimeSettings.mjs";
import { downloadContentFromMessage } from "@whiskeysockets/baileys";
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const SETTING_ALIASES = {
  owner: "ownerNumber",
  ownernumber: "ownerNumber",
  number: "ownerNumber",
  name: "botName",
  botname: "botName",
  image: "botImage",
  botimage: "botImage",
  prefix: "prefix",
  layout: "layout",
  menulayout: "layout",
};

function maskNumber(number) {
  if (!number) return "not set";
  return number.length > 4 ? `${number.slice(0, 3)}••••${number.slice(-3)}` : number;
}

function help(prefix, settings) {
  return [
    `╭━━━〔 ⚙️ *BOT CONFIGURATION* 〕━━━╮`,
    `│`,
    `│ 👑 Owner: +${maskNumber(settings.ownerNumber)}`,
    `│ ✦ Name: ${settings.botName}`,
    `│ ◈ Prefix: ${settings.prefix}`,
    `│ 🖼️ Image: ${settings.botImage}`,
    `│ 🎨 Layout: ${settings.layout}/4`,
    `│`,
    `├─ *Commands*`,
    `│ ${prefix}botconfig owner <number>`,
    `│ ${prefix}botconfig name <name>`,
    `│ ${prefix}botconfig image <https://...>`,
    `│ Reply to an image with ${prefix}botconfig image to save it`,
    `│ ${prefix}botconfig prefix <prefix>`,
    `│ ${prefix}botconfig layout <1-4>`,
    `╰━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━╯`,
  ].join("\n");
}

function getMessageContext(msg) {
  return (
    msg.message?.extendedTextMessage?.contextInfo ||
    msg.message?.imageMessage?.contextInfo ||
    msg.message?.documentMessage?.contextInfo ||
    null
  );
}

function unwrapMessage(message) {
  let current = message;
  for (let i = 0; i < 4 && current; i += 1) {
    const wrapped =
      current.ephemeralMessage ||
      current.viewOnceMessage ||
      current.viewOnceMessageV2 ||
      current.viewOnceMessageV2Extension;
    if (!wrapped?.message) break;
    current = wrapped.message;
  }
  return current;
}

async function saveAttachedMenuImage(msg) {
  const direct = unwrapMessage(msg.message || {});
  const quoted = unwrapMessage(getMessageContext(msg)?.quotedMessage || {});
  const imageMessage = direct.imageMessage || quoted.imageMessage;
  if (!imageMessage) return null;

  const stream = await downloadContentFromMessage(imageMessage, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("The attached image was empty.");

  const settingsFile = process.env.BOT_SETTINGS_FILE
    ? path.resolve(process.env.BOT_SETTINGS_FILE)
    : path.resolve("data", "botSettings.json");
  const imageDir = path.join(path.dirname(settingsFile), "media");
  const mime = String(imageMessage.mimetype || "image/jpeg").toLowerCase();
  const extension = mime.includes("png") ? ".png"
    : mime.includes("webp") ? ".webp"
      : ".jpg";
  const imagePath = path.join(imageDir, `menu-image${extension}`);

  mkdirSync(imageDir, { recursive: true });
  writeFileSync(imagePath, buffer);
  return imagePath;
}

export default {
  name: "botconfig",
  aliases: ["configbot", "setbot", "botsettings", "botname", "botimage", "botprefix", "botlayout"],
  description: "Change owner, bot identity, prefix, image, and menu layout",
  category: "owner",
  usage: ".botconfig <owner|name|image|prefix|layout> <value>",
  isOwner: false,
  isStaff:true,
  cooldown: 3,

  async run({ sock, msg, args, cmd, prefix, isOwner, staffLevel }) {
    const jid = msg.key.remoteJid;
    if (!isOwner && Number(staffLevel) < 3) {
      return sock.sendMessage(jid, {
        text: "❌ Only the bot owner or staff level 3+ can change runtime bot settings.",
      }, { quoted: msg });
    }
    const settings = getRuntimeSettings();
    const aliasSetting = {
      botname: "botName",
      botimage: "botImage",
      botprefix: "prefix",
      botlayout: "layout",
    }[cmd];
    const setting = aliasSetting || SETTING_ALIASES[(args[0] || "").toLowerCase()];

    if (!setting) {
      return sock.sendMessage(jid, { text: help(prefix, settings) }, { quoted: msg });
    }

    let value = aliasSetting ? args.join(" ").trim() : args.slice(1).join(" ").trim();
    if (!value && setting === "botImage") {
      try {
        value = await saveAttachedMenuImage(msg) || "";
      } catch (error) {
        return sock.sendMessage(jid, {
          text: `❌ Could not save that image: ${error.message}`,
        }, { quoted: msg });
      }
    }
    if (!value) {
      return sock.sendMessage(jid, {
        text: `❌ Provide a value.\n\n${help(prefix, settings)}`,
      }, { quoted: msg });
    }

    try {
      const updated = updateRuntimeSetting(setting, value);
      const display = setting === "ownerNumber"
        ? `+${maskNumber(updated.ownerNumber)}`
        : updated[setting];
      return sock.sendMessage(jid, {
        text: [
          "✅ *Bot setting updated*",
          "",
          `• Setting: *${setting}*`,
          `• Value: *${display}*`,
          "",
          setting === "prefix"
            ? `Use the new prefix immediately: *${updated.prefix}menu*`
            : "Saved to the runtime settings and .env for the next restart.",
        ].join("\n"),
      }, { quoted: msg });
    } catch (error) {
      return sock.sendMessage(jid, {
        text: `❌ ${error.message}`,
      }, { quoted: msg });
    }
  },
};