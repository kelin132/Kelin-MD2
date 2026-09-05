/**
 * KELIN MD — .instagram command
 * Downloads Instagram posts, reels, and videos via yt-dlp (auto-downloaded).
 */

import { readFileSync }          from 'fs';
import {
  isValidInstagramUrl,
  getInstagramInfo,
  downloadInstagramVideo,
} from '../../lib/instagram.mjs';

// ── Dedup ─────────────────────────────────────────────────────────────────────
const processedMessages = new Set();

// ── Plugin ────────────────────────────────────────────────────────────────────
export default {
  name: 'instagram',
  description: 'Download Instagram posts, reels, and videos',
  category: 'download',
  usage: '.instagram <Instagram URL>',
  aliases: ['ig', 'igdl', 'reels', 'insta', 'reel'],
  cooldown: 30,

  async run({ sock, msg, args, text }) {
    const jid = msg.key.remoteJid;

    // Dedup
    if (processedMessages.has(msg.key.id)) return;
    processedMessages.add(msg.key.id);
    setTimeout(() => processedMessages.delete(msg.key.id), 5 * 60 * 1000);

    // Extract URL
    const raw   = text || args.join(' ');
    const match = raw.match(/https?:\/\/\S+/);
    const url   = match?.[0]?.replace(/[<>]/g, '');

    if (!url || !isValidInstagramUrl(url)) {
      return sock.sendMessage(jid, {
        text:
          '📸 *Instagram Downloader*\n\n' +
          'Usage: *.instagram <URL>*\n\n' +
          'Supported:\n' +
          '• Posts:   instagram.com/p/…\n' +
          '• Reels:   instagram.com/reel/…\n' +
          '• TV:      instagram.com/tv/…\n' +
          '• Stories: instagram.com/stories/…',
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: '⏳', key: msg.key } });
      await sock.sendMessage(jid, { text: '⏳ Downloading Instagram media…' }, { quoted: msg });

      const info = await getInstagramInfo(url.trim());
      const isVideo = !!(info.duration > 0 || /reel|tv/i.test(url));

      const caption =
        `📥 *${(info.title || 'Instagram Post').slice(0, 200)}*\n` +
        `👤 *${info.author}*\n` +
        `✨ *Powered by KELIN MD*`;

      if (isVideo) {
        const { filePath, cleanup } = await downloadInstagramVideo(url.trim());
        try {
          const buffer = readFileSync(filePath);
          await sock.sendMessage(jid, {
            video:    buffer,
            mimetype: 'video/mp4',
            caption,
          }, { quoted: msg });
        } finally {
          cleanup();
        }
      } else {
        const imageUrl = info.videoUrl || info.thumbnail;
        const res = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer':    'https://www.instagram.com/',
          },
          signal: AbortSignal.timeout(45_000),
        });
        if (!res.ok) throw new Error(`Image fetch failed: HTTP ${res.status}`);
        const buffer = Buffer.from(await res.arrayBuffer());

        await sock.sendMessage(jid, {
          image:   buffer,
          caption,
        }, { quoted: msg });
      }

      await sock.sendMessage(jid, { react: { text: '✅', key: msg.key } });

    } catch (err) {
      console.error('[instagram]', err.message);
      await sock.sendMessage(jid, { react: { text: '❌', key: msg.key } });
      await sock.sendMessage(jid, {
        text:
          `❌ *Instagram download failed.*\n\n` +
          `_${err.message.slice(0, 300)}_\n\n` +
          `💡 Make sure the post is public and the URL is correct.`,
      }, { quoted: msg });
    }
  },
};
