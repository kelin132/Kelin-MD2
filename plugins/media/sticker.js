// plugins/media/sticker.js
// Convert image, short video, or existing sticker → WhatsApp sticker.

import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { Sticker, StickerTypes } from 'wa-sticker-formatter';
import pino from 'pino';

function unwrapMessage(message) {
  if (!message) return null;
  if (message.ephemeralMessage)            return unwrapMessage(message.ephemeralMessage.message);
  if (message.viewOnceMessage)             return unwrapMessage(message.viewOnceMessage.message);
  if (message.viewOnceMessageV2)           return unwrapMessage(message.viewOnceMessageV2.message);
  if (message.documentWithCaptionMessage)  return unwrapMessage(message.documentWithCaptionMessage.message);
  return message;
}

function getContext(m) {
  return (
    m.message?.extendedTextMessage?.contextInfo ||
    m.message?.imageMessage?.contextInfo       ||
    m.message?.videoMessage?.contextInfo       ||
    m.message?.stickerMessage?.contextInfo     ||
    {}
  );
}

function getMediaType(message) {
  if (!message) return null;
  if (message.imageMessage)   return 'imageMessage';
  if (message.videoMessage)   return 'videoMessage';
  if (message.stickerMessage) return 'stickerMessage';
  return null;
}

export default {
  name: 'sticker',
  aliases: ['s', 'stik', 'stiker'],
  category: 'media',
  description: 'Convert an image, short video, or sticker to a sticker',
  usage: '.s (reply to or caption an image/video/sticker)',
  cooldown: 5,
  isOwner: false,
  isAdmin: false,
  isPremium: false,

  async run({ sock, msg, sender }) {
    const jid = msg.key.remoteJid;

    const reply = (text) =>
      sock.sendMessage(jid, { text }, { quoted: msg });

    try {
      const ctx    = getContext(msg);
      const quoted = unwrapMessage(ctx?.quotedMessage);
      const own    = unwrapMessage(msg.message);

      let targetMessage;
      let messageToDownload;

      if (quoted && getMediaType(quoted)) {
        targetMessage    = quoted;
        messageToDownload = {
          message: quoted,
          key: {
            remoteJid:   jid,
            id:          ctx.stanzaId,
            participant: ctx.participant || ctx.quotedParticipant || sender,
          },
        };
      } else if (own && getMediaType(own)) {
        targetMessage    = own;
        messageToDownload = msg;
      } else {
        return reply('❌ Reply to an image, short video, or sticker to make a sticker.');
      }

      const type  = getMediaType(targetMessage);
      const media = targetMessage[type];

      if (type === 'videoMessage' && Number(media?.seconds || 0) > 10) {
        return reply('❌ Video is too long. Please use a video under 10 seconds.');
      }

      // Send a "working…" status that we'll edit in-place
      const status = await sock.sendMessage(jid, { text: '⏳ Creating sticker…' }, { quoted: msg });

      const buffer = await downloadMediaMessage(
        messageToDownload,
        'buffer',
        {},
        {
          logger:          pino({ level: 'silent' }),
          reuploadRequest: sock.updateMediaMessage,
        }
      ).catch(err => {
        console.error('STICKER DOWNLOAD ERROR:', err);
        return null;
      });

      if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 50) {
        return sock.sendMessage(jid, {
          text: '❌ Failed to download media. Please resend the image/video and try again.',
          edit: status.key,
        });
      }

      const sticker = new Sticker(buffer, {
        pack:       'KELIN-MD',
        author:     'KELIN-MD',
        type:       StickerTypes.FULL,
        categories: ['🤩', '✨'],
        id:         'kelin-md-sticker',
        quality:    80,
      });

      const stickerBuffer = await sticker.toBuffer();
      await sock.sendMessage(jid, { sticker: stickerBuffer }, { quoted: msg });
      await sock.sendMessage(jid, { text: '✅ Sticker created!', edit: status.key });

    } catch (err) {
      console.error('STICKER CMD ERROR:', err);
      return reply('❌ Failed to create sticker. Make sure the file is an image or a short video under 10 seconds.');
    }
  },
};
