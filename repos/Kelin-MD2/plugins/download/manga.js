import { requestJson } from "../../lib/http.mjs";

const JIKAN_URL = "https://api.jikan.moe/v4/manga";
const MANGADEX_URL = "https://api.mangadex.org/manga";

function cleanText(value, fallback = "Unknown") {
  if (value === undefined || value === null) return fallback;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text || fallback;
}

function getMangaDexTitle(attributes) {
  const titles = attributes?.title || {};
  return (
    titles.en ||
    titles["ja-ro"] ||
    titles.ja ||
    titles.ko ||
    Object.values(titles)[0] ||
    "Unknown"
  );
}

function getMangaDexSynopsis(attributes) {
  const descriptions = attributes?.description || {};
  return (
    descriptions.en ||
    descriptions["pt-br"] ||
    descriptions.id ||
    Object.values(descriptions)[0] ||
    "No synopsis available."
  );
}

function getMangaDexCover(manga) {
  const cover = manga?.relationships?.find(
    (relationship) =>
      relationship.type === "cover_art" && relationship.attributes?.fileName
  );
  return cover
    ? `https://uploads.mangadex.org/covers/${manga.id}/${cover.attributes.fileName}.512.jpg`
    : null;
}

async function getFromJikan(query) {
  const data = await requestJson(
    `${JIKAN_URL}?q=${encodeURIComponent(query)}&limit=1`,
    { timeoutMs: 15_000 }
  );
  if (!Array.isArray(data?.data)) {
    throw new Error("Jikan returned an invalid manga response.");
  }
  return data.data[0] || null;
}

async function getFromMangaDex(query) {
  const data = await requestJson(
    `${MANGADEX_URL}?title=${encodeURIComponent(query)}&limit=1&contentRating%5B%5D=safe&includes%5B%5D=cover_art&order%5Brelevance%5D=desc`,
    {
      timeoutMs: 20_000,
      headers: {
        Accept: "application/json",
        "User-Agent": "Kelin-MD2/1.0",
      },
    }
  );
  if (!Array.isArray(data?.data)) {
    throw new Error("MangaDex returned an invalid manga response.");
  }
  const manga = data.data[0];
  if (!manga) return null;

  const attributes = manga.attributes || {};
  return {
    title: getMangaDexTitle(attributes),
    type: "Manga",
    score: null,
    chapters: attributes.lastChapter || null,
    volumes: attributes.lastVolume || null,
    published: { string: attributes.year || null },
    status: cleanText(attributes.status),
    synopsis: getMangaDexSynopsis(attributes),
    url: `https://mangadex.org/title/${manga.id}`,
    imageUrl: getMangaDexCover(manga),
  };
}

async function findManga(query) {
  try {
    const manga = await getFromJikan(query);
    if (manga) {
      return {
        title: manga.title,
        type: manga.type,
        score: manga.score,
        chapters: manga.chapters,
        volumes: manga.volumes,
        published: manga.published?.string,
        status: manga.status,
        synopsis: manga.synopsis,
        url: manga.url,
        imageUrl:
          manga.images?.jpg?.large_image_url || manga.images?.jpg?.image_url,
      };
    }
  } catch (error) {
    console.error("[manga] Jikan lookup failed:", error.message);
  }

  return getFromMangaDex(query);
}

function mangaCaption(manga) {
  return `📕 *${cleanText(manga.title)}*

📚 Type: ${cleanText(manga.type)}
⭐ Score: ${manga.score ?? "N/A"}
📑 Chapters: ${manga.chapters ?? "Unknown"}
📰 Volumes: ${manga.volumes ?? "Unknown"}
📅 Published: ${cleanText(manga.published)}
💫 Status: ${cleanText(manga.status)}

📝 *Synopsis:*
${cleanText(manga.synopsis, "No synopsis available.")}

🔗 ${manga.url || "No source link available."}`;
}

export default {
  name: "mangainfo",
  aliases: ["mng", "manga"],
  description: "Search manga information from MyAnimeList",
  category: "download",
  usage: ".manga info <manga name> | .mangainfo <manga name>",
  cooldown: 5,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    const query = String(text || "").trim().replace(/^info(?:\s+|$)/i, "").trim();
    if (!query) {
      return sock.sendMessage(
        jid,
        {
          text: "❌ Provide a manga name.\n\nExample: .manga info One Piece",
        },
        { quoted: msg }
      );
    }

    try {
      const manga = await findManga(query);
      if (!manga) {
        return sock.sendMessage(
          jid,
          { text: "❌ No manga found with that name." },
          { quoted: msg }
        );
      }

      const caption = mangaCaption(manga);
      if (manga.imageUrl) {
        await sock.sendMessage(
          jid,
          { image: { url: manga.imageUrl }, caption },
          { quoted: msg }
        );
      } else {
        await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      }
    } catch (err) {
      console.error("[manga] all providers failed:", err.message);
      await sock.sendMessage(
        jid,
        { text: "❌ Failed to fetch manga info. Try again later." },
        { quoted: msg }
      );
    }
  },
};