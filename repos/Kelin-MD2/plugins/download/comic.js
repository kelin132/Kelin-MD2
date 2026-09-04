/**
 * KELIN MD — .comic / .manga
 *
 * Flow:
 *   .comic <search terms>       Search comic or manga series
 *   .manga <search terms>       Search manga series
 *   .comic info <number|url>    Show series details and chapters
 *   .manga pdf <number|url>     Generate and send a chapter PDF
 *
 * The API returns different shapes for different comic sources, so the
 * normalizers below intentionally accept the common nested variants.
 */

const API_URL = "https://omegatech-api.dixonomega.tech/api/Fun/Comic";
const MANGADEX_API_URL = "https://api.mangadex.org";
const sessions = new Map();
const MAX_RESULTS = 8;
const MAX_CHAPTERS = 40;
const MAX_PDF_PAGES = 60;
const MAX_PDF_BYTES = 45 * 1024 * 1024;

function cleanText(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  return String(value).replace(/\s+/g, " ").trim();
}

function isHttpUrl(value) {
  return typeof value === "string" && /^https?:\/\//i.test(value);
}

function isComicSelection(value) {
  return isHttpUrl(value) || /^mangadex:\/\//i.test(value);
}

function mangaSelectionId(value, type) {
  const prefix = `mangadex://${type}/`;
  return typeof value === "string" && value.startsWith(prefix)
    ? value.slice(prefix.length)
    : null;
}

function safeFileName(value) {
  return cleanText(value, "comic-chapter")
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 90);
}

function resultRoot(data) {
  return data?.data ?? data?.result ?? data;
}

function asItems(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return [value];
  return [];
}

function resultItems(data) {
  const root = resultRoot(data);
  const containers = [
    root?.results,
    root?.items,
    root?.comics,
    root?.series,
    root?.data,
    root,
  ];

  for (const container of containers) {
    const items = asItems(container).filter((item) => item && typeof item === "object");
    if (items.length) return items;
  }
  return [];
}

function itemTitle(item, fallback = "Untitled comic") {
  return cleanText(
    item?.title ||
    item?.name ||
    item?.seriesTitle ||
    item?.judul ||
    item?.comic?.title ||
    fallback,
    fallback
  );
}

function itemUrl(item) {
  const url =
    item?.url ||
    item?.link ||
    item?.href ||
    item?.seriesUrl ||
    item?.detailUrl ||
    item?.comic?.url;
  return isHttpUrl(url) ? url : null;
}

function itemCover(item) {
  return (
    item?.thumbnail ||
    item?.cover ||
    item?.coverImage ||
    item?.image ||
    item?.imageUrl ||
    item?.comic?.cover ||
    null
  );
}

function itemDescription(item) {
  return cleanText(
    item?.description ||
    item?.synopsis ||
    item?.sinopsis ||
    item?.summary ||
    item?.comic?.description ||
    "No description available.",
    "No description available."
  );
}

function mangaTitle(attributes, fallback = "Untitled comic") {
  const titles = attributes?.title || {};
  return cleanText(
    titles.en ||
    titles["ja-ro"] ||
    titles.ja ||
    titles.ko ||
    Object.values(titles)[0] ||
    fallback,
    fallback
  );
}

function mangaDescription(attributes) {
  const descriptions = attributes?.description || {};
  return cleanText(
    descriptions.en ||
    descriptions.id ||
    descriptions["pt-br"] ||
    Object.values(descriptions)[0] ||
    "No description available.",
    "No description available."
  );
}

function mangaCover(item) {
  const cover = item?.relationships?.find((relationship) =>
    relationship.type === "cover_art" && relationship.attributes?.fileName
  );
  return cover
    ? `https://uploads.mangadex.org/covers/${item.id}/${cover.attributes.fileName}.512.jpg`
    : null;
}

function chapterItems(data) {
  const root = resultRoot(data);
  const candidates = [
    root?.chapters,
    root?.chapterList,
    root?.episodes,
    root?.data?.chapters,
    root?.result?.chapters,
  ];

  for (const candidate of candidates) {
    const items = asItems(candidate).filter((item) =>
      typeof item === "string" || (item && typeof item === "object")
    );
    if (items.length) return items.slice(0, MAX_CHAPTERS);
  }
  return [];
}

function chapterTitle(chapter, index) {
  if (typeof chapter === "string") return `Chapter ${index + 1}`;
  return cleanText(
    chapter?.title ||
    chapter?.name ||
    chapter?.chapter ||
    chapter?.chapterTitle ||
    chapter?.episode ||
    `Chapter ${index + 1}`,
    `Chapter ${index + 1}`
  );
}

function chapterUrl(chapter) {
  if (typeof chapter === "string") return isHttpUrl(chapter) ? chapter : null;
  const url =
    chapter?.url ||
    chapter?.link ||
    chapter?.href ||
    chapter?.chapterUrl ||
    chapter?.episodeUrl;
  return isHttpUrl(url) ? url : null;
}

function menuBox(title, lines) {
  return [
    `╭─📚「 𝗖𝗢𝗠𝗜𝗖 ${title ? `· ${title}` : ""} 」`,
    "│",
    ...lines.map((line) => `│ ꕥ ${line}`),
    "╰━━━━━━━━━━━━━━━━━━━━",
  ].join("\n");
}

function usageText() {
  return menuBox("", [
    "𝗨𝗦𝗔𝗚𝗘",
    "ꕥ .comic <title> — search comics",
    "ꕥ .manga <title> — search manga",
    "ꕥ .comic info <number|url> — show details",
    "ꕥ .comic pdf <number|url> — send chapter PDF",
    "",
    "𝗘𝗫𝗔𝗠𝗣𝗟𝗘",
    "ꕥ .comic solo leveling",
    "ꕥ .comic info 1",
    "ꕥ .comic pdf 2",
  ]);
}

function remember(jid, key, value) {
  const current = sessions.get(jid) || {};
  sessions.set(jid, { ...current, [key]: value });
}

function getSession(jid) {
  return sessions.get(jid) || {};
}

function resolveSelection(value, items, getUrl) {
  if (!value) return null;
  if (isComicSelection(value)) return value;

  const index = Number.parseInt(value, 10);
  if (!Number.isInteger(index) || index < 1 || index > items.length) return null;
  return getUrl(items[index - 1]);
}

function apiError(data, status, raw) {
  const detail =
    data?.error ||
    data?.message ||
    data?.msg ||
    raw ||
    `HTTP ${status}`;
  return new Error(`Comic API error (${status}): ${cleanText(detail)}`);
}

async function requestComic(params, { expectBinary = false } = {}) {
  const url = new URL(API_URL);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: expectBinary ? "application/pdf, application/json" : "application/json",
      "User-Agent": "Kelin-MD2/1.0",
    },
    signal: AbortSignal.timeout(expectBinary ? 90_000 : 30_000),
  });
  const contentType = (response.headers.get("content-type") || "").toLowerCase();

  if (expectBinary && (contentType.includes("application/pdf") || contentType.includes("application/octet-stream"))) {
    if (!response.ok) {
      throw new Error(`Comic PDF error (HTTP ${response.status})`);
    }
    return {
      binary: Buffer.from(await response.arrayBuffer()),
      contentType,
      data: null,
    };
  }

  const raw = await response.text().catch(() => "");
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.success === false) {
    throw apiError(data, response.status, raw);
  }

  return { data, contentType, raw };
}

async function requestMangaDex(path, params = {}) {
  const url = new URL(`${MANGADEX_API_URL}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      url.searchParams.append(key, String(value));
    }
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "Kelin-MD2/1.0",
    },
    signal: AbortSignal.timeout(45_000),
  });
  const raw = await response.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = null;
  }

  if (!response.ok || data?.result === "error") {
    throw new Error(`MangaDex API error (${response.status})`);
  }
  return data;
}

async function searchMangaDex(query) {
  const data = await requestMangaDex("/manga", {
    title: query,
    limit: MAX_RESULTS,
    "contentRating[]": "safe",
    "includes[]": "cover_art",
    "order[relevance]": "desc",
  });

  return (data?.data || []).map((item) => ({
    title: mangaTitle(item.attributes),
    url: `mangadex://manga/${item.id}`,
    cover: mangaCover(item),
    source: "mangadex",
    item,
  }));
}

async function searchComics(query) {
  try {
    const { data } = await requestComic({
      action: "search",
      query,
      includeDoujin: false,
    });
    const results = resultItems(data)
      .map((item) => ({
        title: itemTitle(item),
        url: itemUrl(item),
        cover: itemCover(item),
        source: "omegatech",
        item,
      }))
      .filter((item) => item.url)
      .slice(0, MAX_RESULTS);
    if (results.length) return results;
  } catch (error) {
    console.error("[comic] OmegaTech search failed:", error.message);
  }

  return searchMangaDex(query);
}

async function getDetails(url) {
  const mangaId = mangaSelectionId(url, "manga");
  if (mangaId) {
    const [mangaResponse, feedResponse] = await Promise.all([
      requestMangaDex(`/manga/${mangaId}`, { "includes[]": "cover_art" }),
      requestMangaDex(`/manga/${mangaId}/feed`, {
        limit: MAX_CHAPTERS,
        "translatedLanguage[]": "en",
        "order[volume]": "asc",
        "order[chapter]": "asc",
        "includeEmptyPages": "0",
      }),
    ]);
    const manga = mangaResponse?.data;
    const chapters = (feedResponse?.data || [])
      .filter((chapter) => !chapter.attributes?.isUnavailable && chapter.attributes?.pages > 0)
      .map((chapter, index) => {
        const attributes = chapter.attributes || {};
        const number = attributes.chapter ? `Chapter ${attributes.chapter}` : `Chapter ${index + 1}`;
        const title = cleanText(attributes.title);
        return {
          title: title ? `${number}: ${title}` : number,
          url: `mangadex://chapter/${chapter.id}`,
        };
      });

    return {
      title: mangaTitle(manga?.attributes),
      description: mangaDescription(manga?.attributes),
      author: "MangaDex",
      status: cleanText(manga?.attributes?.status, "Unknown"),
      chapters,
      cover: mangaCover(manga),
      source: "mangadex",
    };
  }

  const { data } = await requestComic({ action: "detail", url });
  const root = resultRoot(data);
  const source = root?.comic || root?.series || root;
  return {
    title: itemTitle(source),
    description: itemDescription(source),
    author: cleanText(source?.author || source?.artist || source?.penulis, "Unknown"),
    status: cleanText(source?.status || source?.type, "Unknown"),
    chapters: chapterItems(data).map((chapter, index) => ({
      title: chapterTitle(chapter, index),
      url: chapterUrl(chapter),
      chapter,
    })).filter((chapter) => chapter.url),
  };
}

async function getPdf(url) {
  const chapterId = mangaSelectionId(url, "chapter");
  if (chapterId) return getMangaDexPdf(chapterId);

  const result = await requestComic({ action: "pdf", url }, { expectBinary: true });
  if (result.binary?.length) return result.binary;

  const root = resultRoot(result.data);
  const pdfUrl =
    root?.pdf ||
    root?.pdfUrl ||
    root?.downloadUrl ||
    root?.download_url ||
    root?.url ||
    result.data?.pdf;

  if (!isHttpUrl(pdfUrl)) {
    throw new Error("The comic API did not return a PDF file.");
  }

  const pdfResponse = await fetch(pdfUrl, {
    headers: { "User-Agent": "Kelin-MD2/1.0" },
    signal: AbortSignal.timeout(90_000),
  });
  if (!pdfResponse.ok) {
    throw new Error(`PDF download failed (HTTP ${pdfResponse.status}).`);
  }
  const buffer = Buffer.from(await pdfResponse.arrayBuffer());
  if (!buffer.length) throw new Error("The returned PDF was empty.");
  return buffer;
}

function jpegDimensions(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    throw new Error("MangaDex returned a non-JPEG page.");
  }

  let offset = 2;
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = buffer[offset + 1];
    offset += 2;
    if (marker === 0xd8 || marker === 0xd9) continue;
    if (offset + 2 > buffer.length) break;
    const segmentLength = buffer.readUInt16BE(offset);
    if (segmentLength < 2 || offset + segmentLength > buffer.length) break;
    const isSizeMarker =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);
    if (isSizeMarker && segmentLength >= 7) {
      return {
        width: buffer.readUInt16BE(offset + 5),
        height: buffer.readUInt16BE(offset + 3),
      };
    }
    offset += segmentLength;
  }
  throw new Error("Could not read MangaDex page dimensions.");
}

function buildJpegPdf(images) {
  const objects = [];
  const pageObjectNumbers = [];
  let nextObjectNumber = 3;

  for (const image of images) {
    const pageObjectNumber = nextObjectNumber++;
    const imageObjectNumber = nextObjectNumber++;
    const contentObjectNumber = nextObjectNumber++;
    pageObjectNumbers.push(pageObjectNumber);
    image.pageObjectNumber = pageObjectNumber;
    image.imageObjectNumber = imageObjectNumber;
    image.contentObjectNumber = contentObjectNumber;
  }

  objects[1] = Buffer.from("<< /Type /Catalog /Pages 2 0 R >>");
  objects[2] = Buffer.from(
    `<< /Type /Pages /Kids [${pageObjectNumbers.map((number) => `${number} 0 R`).join(" ")}] /Count ${images.length} >>`
  );

  for (const image of images) {
    const { width, height } = jpegDimensions(image.buffer);
    image.width = width;
    image.height = height;
    objects[image.pageObjectNumber] = Buffer.from(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] ` +
      `/Resources << /XObject << /Im  ${image.imageObjectNumber} 0 R >> >> ` +
      `/Contents ${image.contentObjectNumber} 0 R >>`
    );
    const content = Buffer.from(`q\n${width} 0 0 ${height} 0 0 cm\n/Im Do\nQ\n`);
    objects[image.contentObjectNumber] = {
      dictionary: Buffer.from(`<< /Length ${content.length} >>`),
      stream: content,
    };
    objects[image.imageObjectNumber] = {
      dictionary: Buffer.from(
        `<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} ` +
        `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.buffer.length} >>`
      ),
      stream: image.buffer,
    };
  }

  const chunks = [Buffer.from("%PDF-1.4\n%\xff\xff\xff\xff\n")];
  const offsets = Array(nextObjectNumber).fill(0);
  let position = chunks[0].length;
  for (let number = 1; number < nextObjectNumber; number += 1) {
    offsets[number] = position;
    const value = objects[number];
    const body = Buffer.isBuffer(value)
      ? Buffer.concat([value, Buffer.from("\n")])
      : Buffer.concat([value.dictionary, Buffer.from("\nstream\n"), value.stream, Buffer.from("\nendstream\n")]);
    const object = Buffer.concat([
      Buffer.from(`${number} 0 obj\n`),
      body,
      Buffer.from("endobj\n"),
    ]);
    chunks.push(object);
    position += object.length;
  }

  const xrefOffset = position;
  const xref = [
    `xref\n0 ${nextObjectNumber}\n`,
    "0000000000 65535 f \n",
    ...offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`),
    `trailer\n<< /Size ${nextObjectNumber} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`,
  ];
  chunks.push(Buffer.from(xref.join("")));
  return Buffer.concat(chunks);
}

async function getMangaDexPdf(chapterId) {
  const server = await requestMangaDex(`/at-home/server/${chapterId}`);
  const baseUrl = server?.baseUrl;
  const chapter = server?.chapter;
  // dataSaver keeps the source format normalized to JPEG, which lets the
  // lightweight PDF writer embed pages without requiring an image library.
  const useDataSaver = Array.isArray(chapter?.dataSaver) && chapter.dataSaver.length > 0;
  const pageNames = useDataSaver ? chapter.dataSaver : chapter?.data || [];
  const pagePath = useDataSaver ? "data-saver" : "data";
  if (!baseUrl || !chapter?.hash || !pageNames.length) {
    throw new Error("No readable pages were returned for this chapter.");
  }

  const selectedPages = pageNames.slice(0, MAX_PDF_PAGES);
  const images = [];
  let totalBytes = 0;
  for (const pageName of selectedPages) {
    const response = await fetch(
      `${baseUrl}/${pagePath}/${chapter.hash}/${encodeURIComponent(pageName)}`,
      {
        headers: { "User-Agent": "Kelin-MD2/1.0" },
        signal: AbortSignal.timeout(60_000),
      }
    );
    if (!response.ok) throw new Error(`MangaDex page download failed (HTTP ${response.status}).`);
    const buffer = Buffer.from(await response.arrayBuffer());
    totalBytes += buffer.length;
    if (totalBytes > MAX_PDF_BYTES) {
      throw new Error("This chapter is too large to send as one PDF.");
    }
    images.push({ buffer });
  }

  return buildJpegPdf(images);
}

async function sendSearchResults(sock, msg, query, results) {
  const jid = msg.key.remoteJid;
  const sessionResults = results.map(({ title, url, cover }) => ({ title, url, cover }));
  remember(jid, "searchResults", sessionResults);

  const lines = [
    `𝗥𝗘𝗦𝗨𝗟𝗧𝗦 𝗙𝗢𝗥: ${query}`,
    "",
    ...sessionResults.map((result, index) => `${index + 1}. ${result.title}`),
    "",
    "ꕥ .comic info <number> — view series details",
    "ꕥ .comic pdf <chapter-url> — download a chapter",
  ];

  return sock.sendMessage(jid, {
    text: menuBox("SEARCH", lines),
  }, { quoted: msg });
}

async function sendDetails(sock, msg, details) {
  const jid = msg.key.remoteJid;
  remember(jid, "chapters", details.chapters);

  const chapterLines = details.chapters.length
    ? details.chapters.map((chapter, index) => `${index + 1}. ${chapter.title}`)
    : ["No chapter links were returned by the source."];

  const lines = [
    `𝗧𝗜𝗧𝗟𝗘: ${details.title}`,
    `𝗔𝗨𝗧𝗛𝗢𝗥: ${details.author}`,
    `𝗦𝗧𝗔𝗧𝗨𝗦: ${details.status}`,
    "",
    details.description.slice(0, 420),
    "",
    `𝗖𝗛𝗔𝗣𝗧𝗘𝗥𝗦 (${details.chapters.length})`,
    ...chapterLines,
    "",
    "ꕥ .comic pdf <number> — download a chapter as PDF",
  ];

  return sock.sendMessage(jid, {
    text: menuBox("DETAILS", lines),
  }, { quoted: msg });
}

export default {
  name: "comic",
  aliases: ["manga", "manhwa"],
  description: "Search comics or manga, view details, and download chapters as PDF",
  category: "download",
  usage: ".comic <title> | .comic info <number|url> | .comic pdf <number|url>",
  cooldown: 12,

  async run({ sock, msg, args, text }) {
    const jid = msg.key.remoteJid;
    const action = (args[0] || "").toLowerCase();
    const value = args.slice(1).join(" ").trim();

    if (!text) {
      return sock.sendMessage(jid, { text: usageText() }, { quoted: msg });
    }

    try {
      if (action === "info" || action === "detail") {
        const session = getSession(jid);
        const url = resolveSelection(
          value,
          session.searchResults || [],
          (item) => item.url
        );
        if (!url) {
          return sock.sendMessage(jid, {
            text: menuBox("DETAILS", [
              "Choose a valid search result number or provide the comic URL.",
              "Example: .comic info 1",
            ]),
          }, { quoted: msg });
        }

        await sock.sendMessage(jid, {
          text: "╭─📚「 𝗖𝗢𝗠𝗜𝗖 · LOADING 」\n│ ꕥ Fetching series details...\n╰━━━━━━━━━━━━━━━━━━━━",
        }, { quoted: msg });
        const details = await getDetails(url);
        return sendDetails(sock, msg, details);
      }

      if (action === "pdf" || action === "download") {
        const session = getSession(jid);
        const url = resolveSelection(
          value,
          session.chapters || [],
          (chapter) => chapter.url
        ) || (isHttpUrl(value) ? value : null);
        if (!url) {
          return sock.sendMessage(jid, {
            text: menuBox("PDF", [
              "Choose a valid chapter number after viewing details.",
              "Example: .comic pdf 1",
            ]),
          }, { quoted: msg });
        }

        await sock.sendMessage(jid, {
          text: "╭─📚「 𝗖𝗢𝗠𝗜𝗖 · PDF 」\n│ ꕥ Generating your chapter PDF...\n╰━━━━━━━━━━━━━━━━━━━━",
        }, { quoted: msg });
        const pdf = await getPdf(url);
        const title = session.chapters?.find((chapter) => chapter.url === url)?.title || "comic-chapter";
        return sock.sendMessage(jid, {
          document: pdf,
          mimetype: "application/pdf",
          fileName: `${safeFileName(title)}.pdf`,
          caption: menuBox("PDF READY", [
            `𝗖𝗛𝗔𝗣𝗧𝗘𝗥: ${title}`,
            "Your comic chapter is attached as a PDF.",
          ]),
        }, { quoted: msg });
      }

      const query = text.trim();
      await sock.sendMessage(jid, {
        text: `╭─📚「 𝗖𝗢𝗠𝗜𝗖 · SEARCH 」\n│ ꕥ Searching for: ${query}\n╰━━━━━━━━━━━━━━━━━━━━`,
      }, { quoted: msg });
      const results = await searchComics(query);
      if (!results.length) {
        return sock.sendMessage(jid, {
          text: menuBox("SEARCH", [
            `No comics found for: ${query}`,
            "Try a shorter title or a different spelling.",
          ]),
        }, { quoted: msg });
      }
      return sendSearchResults(sock, msg, query, results);
    } catch (error) {
      console.error("[comic]", error.message);
      return sock.sendMessage(jid, {
        text: menuBox("ERROR", [
          "The comic request could not be completed.",
          cleanText(error.message, "Try again later.").slice(0, 300),
        ]),
      }, { quoted: msg });
    }
  },
};