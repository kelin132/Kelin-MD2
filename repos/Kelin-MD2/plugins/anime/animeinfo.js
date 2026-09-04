const ANILIST_URL = "https://graphql.anilist.co";
const JIKAN_URL = "https://api.jikan.moe/v4";

const ANILIST_QUERY = `
query ($search: String, $id: Int) {
  Media(search: $search, id: $id, type: ANIME) {
    title { romaji english native }
    format
    status
    episodes
    duration
    averageScore
    genres
    studios(isMain: true) { nodes { name } }
    startDate { year }
    description(asHtml: false)
    siteUrl
    coverImage { extraLarge large medium }
  }
}`;

function trimText(value, maxLength) {
  const text = String(value || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

async function fetchJson(url, options = {}, timeoutMs = 15_000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fromAniList(query) {
  const variables = /^\d+$/.test(query) ? { id: Number(query) } : { search: query };
  const result = await fetchJson(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ query: ANILIST_QUERY, variables }),
  });
  const media = result?.data?.Media;
  if (!media) return null;

  const status = {
    FINISHED: "Finished Airing",
    RELEASING: "Currently Airing",
    NOT_YET_RELEASED: "Not Yet Aired",
    CANCELLED: "Cancelled",
    HIATUS: "On Hiatus",
  };

  return {
    title: media.title?.english || media.title?.romaji || media.title?.native || "Unknown",
    japanese: media.title?.native || "",
    type: media.format?.replace(/_/g, " ") || "",
    status: status[media.status] || media.status || "",
    episodes: media.episodes || "",
    duration: media.duration ? `${media.duration} min` : "",
    score: media.averageScore ? (media.averageScore / 10).toFixed(1) : "",
    rank: "",
    aired: media.startDate?.year ? String(media.startDate.year) : "",
    studios: (media.studios?.nodes || []).map((studio) => studio.name).join(", "),
    genres: (media.genres || []).join(", "),
    synopsis: media.description || "",
    url: media.siteUrl || "",
    thumb: media.coverImage?.extraLarge || media.coverImage?.large || media.coverImage?.medium || "",
  };
}

async function fromJikan(query) {
  let lastError;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const endpoint = /^\d+$/.test(query)
        ? `${JIKAN_URL}/anime/${query}/full`
        : `${JIKAN_URL}/anime?q=${encodeURIComponent(query)}&limit=1&sfw=true`;
      const result = await fetchJson(endpoint);
      const anime = /^\d+$/.test(query) ? result?.data : result?.data?.[0];
      if (!anime) return null;

      return {
        title: anime.title_english || anime.title || anime.title_japanese || "Unknown",
        japanese: anime.title_japanese || "",
        type: anime.type || "",
        status: anime.status || "",
        episodes: anime.episodes || "",
        duration: anime.duration || "",
        score: anime.score ? String(anime.score) : "",
        rank: anime.rank ? `#${anime.rank}` : "",
        aired: anime.aired?.string || (anime.year ? String(anime.year) : ""),
        studios: (anime.studios || []).map((studio) => studio.name).join(", "),
        genres: (anime.genres || []).map((genre) => genre.name).join(", "),
        synopsis: anime.synopsis || "",
        url: anime.url || "",
        thumb: anime.images?.jpg?.large_image_url ||
          anime.images?.jpg?.image_url ||
          anime.images?.webp?.image_url || "",
      };
    } catch (err) {
      lastError = err;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw lastError || new Error("Jikan request failed");
}

async function resolveAnime(query) {
  if (/^\d+$/.test(query)) {
    try {
      const result = await fromJikan(query);
      if (result) return result;
    } catch {}
    try {
      return await fromAniList(query);
    } catch {
      return null;
    }
  }

  try {
    const result = await fromAniList(query);
    if (result) return result;
  } catch {}
  try {
    return await fromJikan(query);
  } catch {
    return null;
  }
}

export default {
  name: "anime",
  aliases: ["animeinfo", "animedetail", "ainfo"],
  description: "Get rich anime details by name or MyAnimeList ID",
  category: "anime",
  usage: ".anime <name | MAL id>",
  cooldown: 10,

  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;

    if (!text) {
      return sock.sendMessage(jid, {
        text:
`🎌 *Anime Info*

Usage: .anime <name | MAL id>
Example: .anime jujutsu kaisen
Example: .anime 40748`,
      }, { quoted: msg });
    }

    try {
      await sock.sendMessage(jid, { react: { text: "🔍", key: msg.key } }).catch(() => {});
      const anime = await resolveAnime(text.trim());
      if (!anime) {
        await sock.sendMessage(jid, { react: { text: "❌", key: msg.key } }).catch(() => {});
        return sock.sendMessage(jid, {
          text: `❌ No anime found for *${text.trim()}*.`,
        }, { quoted: msg });
      }

      let caption = `🎌 *${anime.title}*\n`;
      if (anime.japanese) caption += `🇯🇵 ${anime.japanese}\n`;
      caption += "\n";
      if (anime.type) caption += `🎭 Type: ${anime.type}\n`;
      if (anime.status) caption += `📡 Status: ${anime.status}\n`;
      if (anime.episodes) caption += `🎞️ Episodes: ${anime.episodes}\n`;
      if (anime.duration) caption += `⏱️ Duration: ${anime.duration}\n`;
      if (anime.score) caption += `⭐ Score: ${anime.score}\n`;
      if (anime.rank) caption += `🏆 Rank: ${anime.rank}\n`;
      if (anime.aired) caption += `📅 Aired: ${anime.aired}\n`;
      if (anime.studios) caption += `🏢 Studio: ${anime.studios}\n`;
      if (anime.genres) caption += `🏷️ Genres: ${anime.genres}\n`;
      if (anime.synopsis) caption += `\n📖 ${trimText(anime.synopsis, 800)}\n`;
      if (anime.url) caption += `\n🔗 ${anime.url}`;

      if (anime.thumb) {
        try {
          await sock.sendMessage(jid, { image: { url: anime.thumb }, caption }, { quoted: msg });
          return sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
        } catch {}
      }
      await sock.sendMessage(jid, { text: caption }, { quoted: msg });
      await sock.sendMessage(jid, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (err) {
      console.error("[anime]", err.message);
      await sock.sendMessage(jid, {
        text: "❌ Anime info fetch failed. Try again later.",
      }, { quoted: msg });
    }
  },
};
