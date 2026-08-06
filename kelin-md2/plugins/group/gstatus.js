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

    if (!isGroup) {
      // DM usage — requires owner or staff
      if (!isOwner && !isStaff) {
        return reply("❌ Only staff can use this command from a DM.");
      }

      if (hasMedia) {
        // Reply to media: first arg is the group JID
        if (!text) {
          return reply(
`╭─🖼️「 *GSTATUS — DM USAGE* 」─╮
│ Reply to an image or video, then:
│ *.gstatus <groupjid>*
│
│ Example:
│ .gstatus 1234567890-123456@g.us
╰─────────────────────────────❀`
          );
        }
        targetGroup = text.trim();
      } else {
        // Text status: groupjid,message[,color]
        const parts = text.split(",").map(p => p.trim());
        if (parts.length < 2) {
          return reply(
`╭─📝「 *GSTATUS — DM USAGE* 」─╮
│ *.gstatus <groupjid>,<message>[,<color>]*
│
│ Example:
│ .gstatus 1234567890@g.us,Good morning!,green
│
│ Colors: ${Object.keys(COLORS).join(", ")}
╰─────────────────────────────❀`
          );
        }
        targetGroup = parts[0];
        messageText = parts[1];
        if (parts[2] && COLORS[parts[2].toLowerCase()]) {
          chosenColor = COLORS[parts[2].toLowerCase()];
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

    // ── Validate group JID ────────────────────────────────────────────────
    if (!targetGroup?.endsWith("@g.us")) {
      return reply("❌ Invalid group JID. It must end with *@g.us*.");
    }

    try {
      // ── MEDIA STATUS (image or video) ─────────────────────────────────
      if (hasMedia) {
        const isImg   = !!quotedImage;
        const rawMsg  = isImg ? quotedImage : quotedVideo;
        const mType   = isImg ? "image" : "video";

        const buffer = await downloadQuoted(rawMsg, mType);

        const mediaOptions = isImg
          ? { image: buffer, caption: rawMsg.caption || "" }
          : { video: buffer, caption: rawMsg.caption || "" };

        const prepared = await prepareWAMessageMedia(mediaOptions, {
          upload: sock.waUploadToServer,
        });

        const innerMsg = isImg
          ? { imageMessage: prepared.imageMessage }
          : { videoMessage: prepared.videoMessage };

        const payload = { groupStatusMessageV2: { message: innerMsg } };

        const waMsg = generateWAMessageFromContent(
          targetGroup,
          proto.Message.fromObject(payload),
          { userJid: sock.user?.id }
        );

        await sock.relayMessage(targetGroup, waMsg.message, {
          messageId: waMsg.key.id,
        });

      // ── TEXT STATUS ───────────────────────────────────────────────────
      } else {
        if (!messageText?.trim()) {
          return reply("❌ Provide a message or reply to an image/video.");
        }

        const bgColor = chosenColor ?? randomColor();

        const payload = {
          groupStatusMessageV2: {
            message: {
              extendedTextMessage: {
                text:            messageText,
                backgroundArgb:  bgColor,
                font:            2,
              },
            },
          },
        };

        const waMsg = generateWAMessageFromContent(
          targetGroup,
          proto.Message.fromObject(payload),
          { userJid: sock.user?.id }
        );

        await sock.relayMessage(targetGroup, waMsg.message, {
          messageId: waMsg.key.id,
        });
      }

      // ── Success ───────────────────────────────────────────────────────
      await react("✅");
      if (!isGroup) {
        await reply("✅ Group status posted successfully.");
      }

    } catch (err) {
      await react("❌");
      return reply(`❌ Failed to post group status: ${err.message}`);
    }
  },
};
