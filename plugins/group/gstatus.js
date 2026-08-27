/**
 * KELIN MD — .gstatus
 * Post a status update to the current group (text, image, or video).
 * Reply to an image or video then run .gstatus to post that media as status.
 *
 * Usage (inside a group):
 *   .gstatus <text>              — coloured text status (random bg)
 *   .gstatus <text>,<color>      — text status with chosen colour
 *   [reply to image/video] .gstatus — post that media as group status
 *
 * Usage (in DM — owner/staff only):
 *   .gstatus <groupjid>,<text>            — text status to specific group
 *   .gstatus <groupjid>,<text>,<color>    — with colour
 *   [reply to image/video] .gstatus <groupjid>  — media status to specific group
 *
 * Colors: green, red, blue, yellow, purple, black, white, orange
 */
import {
  downloadContentFromMessage,
  prepareWAMessageMedia,
  generateWAMessageFromContent,
  proto,
} from "@whiskeysockets/baileys";

const COLORS = {
  green:  0xFF25D366,
  red:    0xFFFF0000,
  blue:   0xFF0000FF,
  yellow: 0xFFFFFF00,
  purple: 0xFF800080,
  black:  0xFF000000,
  white:  0xFFFFFFFF,
  orange: 0xFFFFA500,
};

/** Random opaque ARGB colour */
function randomColor() {
  const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return 0xff000000 + parseInt(hex, 16);
}

/** Download a quoted media message into a Buffer */
async function downloadQuoted(mediaMsg, type) {
  const stream = await downloadContentFromMessage(mediaMsg, type);
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  return Buffer.concat(chunks);
}

export default {
  name: "gstatus",
  aliases: ["gcstatus", "groupstatus"],
  description: "Post a text, image, or video status to the group",
  category: "group",
  usage: ".gstatus <text[,color]>  |  reply to image/video + .gstatus",
  isMod: true,
  cooldown: 5,

  async run({ sock, msg, args, text, sender, isOwner, isStaff }) {
    const jid     = msg.key.remoteJid;
    const isGroup = jid?.endsWith("@g.us");

    const reply = (t) => sock.sendMessage(jid, { text: t }, { quoted: msg });
    const react = (e) => sock.sendMessage(jid, { react: { text: e, key: msg.key } });

    // ── Resolve quoted media from contextInfo ─────────────────────────────
    const ctx =
      msg.message?.extendedTextMessage?.contextInfo ||
      msg.message?.imageMessage?.contextInfo        ||
      msg.message?.videoMessage?.contextInfo        ||
      msg.message?.audioMessage?.contextInfo        ||
      null;

    const quotedMsg   = ctx?.quotedMessage || null;
    const quotedImage = quotedMsg?.imageMessage   || null;
    const quotedVideo = quotedMsg?.videoMessage   || null;
    const hasMedia    = !!(quotedImage || quotedVideo);

    // ── Parse target group and message text ───────────────────────────────
    let targetGroup   = null;
    let messageText   = null;
    let chosenColor   = null;

    if (!isGroup || text.startsWith("all,")) {
      // DM usage or "all" broadcast — requires owner or staff
      if (!isOwner && !isStaff) {
        return reply("❌ Only staff can use this command from a DM or for broadcast.");
      }

      if (hasMedia) {
        // Reply to media: first arg is the group JID or "all"
        const target = text.trim() || (isGroup ? jid : null);
        if (!target) {
          return reply(
`╭─🖼️「 *GSTATUS — USAGE* 」─╮
│ Reply to an image or video, then:
│ *.gstatus <groupjid | all>*
│
│ Example:
│ .gstatus all
│ .gstatus 1234567890-123456@g.us
╰─────────────────────────────❀`
          );
        }
        targetGroup = target;
      } else {
        // Text status: [all | groupjid],message[,color]
        const parts = text.split(",").map(p => p.trim());
        if (parts.length < (isGroup ? 1 : 2)) {
          return reply(
`╭─📝「 *GSTATUS — USAGE* 」─╮
│ *.gstatus <groupjid | all>,<message>[,<color>]*
│
│ Example:
│ .gstatus all,Hello everyone!
│ .gstatus 1234567890@g.us,Good morning!,green
│
│ Colors: ${Object.keys(COLORS).join(", ")}
╰─────────────────────────────❀`
          );
        }
        
        if (parts[0] === "all" || parts[0].endsWith("@g.us")) {
          targetGroup = parts[0];
          messageText = parts[1];
          if (parts[2] && COLORS[parts[2].toLowerCase()]) {
            chosenColor = COLORS[parts[2].toLowerCase()];
          }
        } else if (isGroup) {
          targetGroup = jid;
          messageText = parts[0];
          if (parts[1] && COLORS[parts[1].toLowerCase()]) {
            chosenColor = COLORS[parts[1].toLowerCase()];
          }
        }
      }
    } else {
      // Group usage
      targetGroup = jid;
      if (!hasMedia) {
        if (!text) {
          return reply(
`╭─📢「 *GSTATUS* 」─╮
│ Post a status update to this group.
│
│ *Text status:*
│ *.gstatus Hello group!*
│ *.gstatus Hello!,blue*
│
│ *Image / video status:*
│ Reply to an image or video, then:
│ *.gstatus*
│
│ 🎨 Colors: ${Object.keys(COLORS).join(", ")}
╰─────────────────────────────❀`
          );
        }

        // Parse inline color: "Hello!,red"
        if (text.includes(",")) {
          const parts  = text.split(",").map(p => p.trim());
          messageText  = parts[0];
          if (parts[1] && COLORS[parts[1].toLowerCase()]) {
            chosenColor = COLORS[parts[1].toLowerCase()];
          }
        } else {
          messageText = text;
        }
      }
    }

    // ── Resolve targets ──────────────────────────────────────────────────
    let targets = [];
    if (targetGroup === "all") {
      const chats = await sock.groupFetchAllParticipating();
      targets = Object.keys(chats);
    } else if (targetGroup?.endsWith("@g.us")) {
      targets = [targetGroup];
    } else {
      return reply("❌ Invalid target. Use a group JID or *all*.");
    }

    if (targets.length === 0) return reply("❌ No target groups found.");

    try {
      let innerMsg = null;
      if (hasMedia) {
        const isImg   = !!quotedImage;
        const rawMsg  = isImg ? quotedImage : quotedVideo;
        const mType   = isImg ? "image" : "video";
        const buffer  = await downloadQuoted(rawMsg, mType);
        const mediaOptions = isImg
          ? { image: buffer, caption: rawMsg.caption || "" }
          : { video: buffer, caption: rawMsg.caption || "" };

        const prepared = await prepareWAMessageMedia(mediaOptions, {
          upload: sock.waUploadToServer,
        });

        innerMsg = isImg
          ? { imageMessage: prepared.imageMessage }
          : { videoMessage: prepared.videoMessage };
      } else {
        if (!messageText?.trim()) {
          return reply("❌ Provide a message or reply to an image/video.");
        }
        const bgColor = chosenColor ?? randomColor();
        innerMsg = {
          extendedTextMessage: {
            text:            messageText,
            backgroundArgb:  bgColor,
            font:            2,
          },
        };
      }

      const payload = { groupStatusMessageV2: { message: innerMsg } };

      let successCount = 0;
      for (const t of targets) {
        try {
          const waMsg = generateWAMessageFromContent(
            t,
            proto.Message.fromObject(payload),
            { userJid: sock.user?.id }
          );
          await sock.relayMessage(t, waMsg.message, { messageId: waMsg.key.id });
          successCount++;
        } catch (e) {
          console.error(`[gstatus] Failed to send to ${t}:`, e.message);
        }
      }

      // ── Success ───────────────────────────────────────────────────────
      await react("✅");
      if (!isGroup || targetGroup === "all") {
        await reply(`✅ Group status posted to *${successCount}/${targets.length}* groups.`);
      }

    } catch (err) {
      await react("❌");
      return reply(`❌ Failed to post group status: ${err.message}`);
    }
  },
};
