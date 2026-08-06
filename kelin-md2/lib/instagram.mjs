/**
 * lib/instagram.mjs — Instagram download helper
 * Calls the yt-dlp_linux standalone binary directly.
 * Binary is auto-downloaded on first use — no npm package or Python needed.
 */

import { execFile }                        from 'child_process';
import { promisify }                        from 'util';
import { existsSync, chmodSync, mkdirSync,
         createWriteStream, unlinkSync }    from 'fs';
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

// Standalone Linux binary — no Python required
const YTDLP_URL =
  'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

// ── Binary bootstrap ──────────────────────────────────────────────────────────
let _binReady = false;

async function ensureBinary() {
  if (_binReady && existsSync(YTDLP_BIN)) return;
  if (existsSync(YTDLP_BIN)) { _binReady = true; return; }

  if (!existsSync(BIN_DIR)) mkdirSync(BIN_DIR, { recursive: true });

  await new Promise((resolve, reject) => {
    const file = createWriteStream(YTDLP_BIN);

    function download(url, hops = 0) {
      if (hops > 5) return reject(new Error('Too many redirects downloading yt-dlp'));
      https.get(url, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          return download(res.headers.location, hops + 1);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`yt-dlp download failed: HTTP ${res.statusCode}`));
        }
        res.pipe(file);
        file.on('finish', () => file.close(resolve));
        file.on('error',  reject);
      }).on('error', reject);
    }

    download(YTDLP_URL);
  });

  chmodSync(YTDLP_BIN, 0o755);
  _binReady = true;
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
      { timeout: 60_000 }
    );
    const metadata = JSON.parse(stdout.trim());

    return {
      id:        metadata.id,
      title:     metadata.title    || metadata.description || 'Instagram Post',
      author:    metadata.uploader || metadata.channel     || 'Unknown',
      thumbnail: metadata.thumbnail || null,
      videoUrl:  metadata.url       || null,
      duration:  metadata.duration  || 0,
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
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '-o', tempFilePath,
        url,
      ],
      { timeout: 120_000 }
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
      { timeout: 120_000 }
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
