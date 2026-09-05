/**
 * lib/instagram.mjs — Instagram download helper
 * Calls the yt-dlp_linux standalone binary directly.
 * Binary is auto-downloaded on first use — no npm package or Python needed.
 */

import { execFile }                        from 'child_process';
import { promisify }                        from 'util';
import { existsSync, chmodSync, mkdirSync,
         createWriteStream, unlinkSync, renameSync } from 'fs';
import { join, dirname }                    from 'path';
import { fileURLToPath }                    from 'url';
import { tmpdir }                           from 'os';
import https                                from 'https';

const execFileAsync = promisify(execFile);

// ── Paths ─────────────────────────────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, '..');
const BIN_DIR   = join(REPO_ROOT, 'bin');
const YTDLP_BIN = join(BIN_DIR, 'yt-dlp');
const YTDLP_TMP_DIR = join(BIN_DIR, '.yt-dlp-tmp');
const FFMPEG_BIN = process.env.FFMPEG_PATH || 'ffmpeg';

// Standalone Linux binary — no Python required
const YTDLP_URL =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

// ── Binary bootstrap ──────────────────────────────────────────────────────────
let _binReady = false;
let _binPromise = null;

function ytDlpOptions(timeout) {
  mkdirSync(YTDLP_TMP_DIR, { recursive: true });
  return {
    timeout,
    env: {
      ...process.env,
      TMPDIR: YTDLP_TMP_DIR,
      TEMP: YTDLP_TMP_DIR,
      TMP: YTDLP_TMP_DIR,
    },
  };
}

async function verifyBinary() {
  await execFileAsync(YTDLP_BIN, ['--version'], ytDlpOptions(30_000));
}

async function ensureBinary() {
  if (_binReady && existsSync(YTDLP_BIN)) return;
  if (_binPromise) return _binPromise;

  _binPromise = (async () => {
    if (!existsSync(BIN_DIR)) mkdirSync(BIN_DIR, { recursive: true });

    if (existsSync(YTDLP_BIN)) {
      try {
        chmodSync(YTDLP_BIN, 0o755);
        await verifyBinary();
        _binReady = true;
        return;
      } catch {
        // A previous download can be truncated or fail to unpack its embedded
        // Python runtime. Remove it so the next attempt gets a clean binary.
        try { unlinkSync(YTDLP_BIN); } catch {}
      }
    }

    await new Promise((resolve, reject) => {
      const downloadPath = `${YTDLP_BIN}.download`;
      try { unlinkSync(downloadPath); } catch {}

      function fail(error) {
        try { unlinkSync(downloadPath); } catch {}
        try { unlinkSync(YTDLP_BIN); } catch {}
        reject(error);
      }

      function download(url, hops = 0) {
        if (hops > 5) return fail(new Error('Too many redirects downloading yt-dlp'));
        https.get(url, (res) => {
          if (res.statusCode === 301 || res.statusCode === 302) {
            res.resume();
            return download(res.headers.location, hops + 1);
          }
          if (res.statusCode !== 200) {
            res.resume();
            return fail(new Error(`yt-dlp download failed: HTTP ${res.statusCode}`));
          }

          const file = createWriteStream(downloadPath);
          file.on('error', fail);
          res.on('error', fail);
          res.pipe(file);
          file.on('finish', () => file.close((error) => {
            if (error) return fail(error);
            try {
              renameSync(downloadPath, YTDLP_BIN);
              resolve();
            } catch (renameError) {
              fail(renameError);
            }
          }));
        }).on('error', fail);
      }

      download(YTDLP_URL);
    });

    chmodSync(YTDLP_BIN, 0o755);
    try {
      await verifyBinary();
    } catch (error) {
      try { unlinkSync(YTDLP_BIN); } catch {}
      throw new Error(`yt-dlp binary failed to start after refresh: ${error.message}`);
    }
    _binReady = true;
  })();

  try {
    return await _binPromise;
  } finally {
    _binPromise = null;
  }
}

// ── Validates Instagram URL ───────────────────────────────────────────────────
/**
 * @param {string} url
 * @returns {boolean}
 */
export function isValidInstagramUrl(url) {
  const regex =
    /(?:https?:\/\/)?(?:www\.)?(?:instagram\.com)\/(?:p|reel|reels|tv|stories)\/([^/?#&]+)/i;
  return regex.test(url);
}

// ── Fetch metadata ────────────────────────────────────────────────────────────
/**
 * Extract metadata (title/caption, thumbnail, video link, author).
 * @param {string} url
 * @returns {Promise<{ id: string, title: string, author: string,
 *                     thumbnail: string, videoUrl: string, duration: number }>}
 */
export async function getInstagramInfo(url) {
  if (!isValidInstagramUrl(url)) throw new Error('Invalid Instagram URL provided.');

  await ensureBinary();

  try {
    const { stdout } = await execFileAsync(
      YTDLP_BIN,
      ['--dump-single-json', '--no-playlist', '--no-warnings', '--quiet', url],
      ytDlpOptions(60_000)
    );
    const metadata = JSON.parse(stdout.trim());

    return {
      id:        metadata.id,
      title:     metadata.title    || metadata.description || 'Instagram Post',
      author:    metadata.uploader || metadata.channel     || 'Unknown',
      thumbnail: metadata.thumbnail || null,
      videoUrl:  metadata.vcodec && metadata.vcodec !== 'none'
        ? metadata.url || null
        : null,
      duration:  metadata.duration  || 0,
      mediaType: metadata.vcodec && metadata.vcodec !== 'none' ? 'video' : 'image',
    };
  } catch (error) {
    throw new Error(`Failed to fetch Instagram metadata: ${error.message}`);
  }
}

// ── Download video ────────────────────────────────────────────────────────────
/**
 * Download an Instagram video/reel to a temp file.
 * @param {string} url
 * @returns {Promise<{ filePath: string, cleanup: Function,
 *                     title: string, author: string }>}
 */
export async function downloadInstagramVideo(url) {
  if (!isValidInstagramUrl(url)) throw new Error('Invalid Instagram URL provided.');

  await ensureBinary();

  const tempFilePath = join(tmpdir(), `ig_video_${Date.now()}.mp4`);

  try {
    const info = await getInstagramInfo(url);

    await execFileAsync(
      YTDLP_BIN,
      [
        '--no-playlist', '--no-warnings', '--quiet',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4][vcodec!=none]/best',
        '--merge-output-format', 'mp4',
        '-o', tempFilePath,
        url,
      ],
      ytDlpOptions(120_000)
    );

    if (!existsSync(tempFilePath)) throw new Error('Output file not found after download.');

    // Instagram can return a fragmented or non-fast-start file even when the
    // filename ends in .mp4. Normalize it to a WhatsApp-friendly H.264/AAC
    // file so the message downloads and plays instead of appearing broken.
    const normalizedPath = `${tempFilePath}.normalized.mp4`;
    try {
      await execFileAsync(
        FFMPEG_BIN,
        [
          '-y',
          '-i', tempFilePath,
          '-map', '0:v:0',
          '-map', '0:a:0?',
          '-c:v', 'libx264',
          '-preset', 'veryfast',
          '-crf', '23',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-movflags', '+faststart',
          normalizedPath,
        ],
        { timeout: 180_000 }
      );
      renameSync(normalizedPath, tempFilePath);
    } finally {
      try { if (existsSync(normalizedPath)) unlinkSync(normalizedPath); } catch {}
    }

    return {
      filePath: tempFilePath,
      cleanup:  () => { try { if (existsSync(tempFilePath)) unlinkSync(tempFilePath); } catch {} },
      title:    info.title,
      author:   info.author,
    };
  } catch (error) {
    try { if (existsSync(tempFilePath)) unlinkSync(tempFilePath); } catch {}
    throw new Error(`Failed to download Instagram video: ${error.message}`);
  }
}

// ── Download audio ────────────────────────────────────────────────────────────
/**
 * Download Instagram audio only to a temp file.
 * @param {string} url
 * @returns {Promise<{ filePath: string, cleanup: Function,
 *                     title: string, author: string }>}
 */
export async function downloadInstagramAudio(url) {
  if (!isValidInstagramUrl(url)) throw new Error('Invalid Instagram URL provided.');

  await ensureBinary();

  const tempFilePath = join(tmpdir(), `ig_audio_${Date.now()}.mp3`);

  try {
    const info = await getInstagramInfo(url);

    await execFileAsync(
      YTDLP_BIN,
      [
        '--no-playlist', '--no-warnings', '--quiet',
        '-x', '--audio-format', 'mp3',
        '-o', tempFilePath,
        url,
      ],
      ytDlpOptions(120_000)
    );

    if (!existsSync(tempFilePath)) throw new Error('Output file not found after download.');

    return {
      filePath: tempFilePath,
      cleanup:  () => { try { if (existsSync(tempFilePath)) unlinkSync(tempFilePath); } catch {} },
      title:    info.title,
      author:   info.author,
    };
  } catch (error) {
    try { if (existsSync(tempFilePath)) unlinkSync(tempFilePath); } catch {}
    throw new Error(`Failed to download Instagram audio: ${error.message}`);
  }
}
