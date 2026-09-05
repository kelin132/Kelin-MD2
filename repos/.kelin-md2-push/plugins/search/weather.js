import { generateWeatherCard } from "../../lib/weatherCard.mjs";

async function fetchWeather(city) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, {
      headers: { "User-Agent": "curl/8" },
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  } finally {
    clearTimeout(timer);
  }
}

export default {
  name: "weather",
  description: "Get current weather for a city",
  category: "search",
  usage: ".weather <city>",
  aliases: ["wthr", "forecast"],
  cooldown: 10,
  async run({ sock, msg, text }) {
    const jid = msg.key.remoteJid;
    if (!text) {
      return sock.sendMessage(jid, {
        text: "🌤️ *Weather Command*\n\nUsage: .weather <city name>\nExample: .weather Harare",
      }, { quoted: msg });
    }

    try {
      const data = await fetchWeather(text.trim());
      const current = data?.current_condition?.[0];
      if (!current) throw new Error("city not found");

      const area = data.nearest_area?.[0] || {};
      const city = area.areaName?.[0]?.value || text.trim();
      const region = area.region?.[0]?.value || "";
      const country = area.country?.[0]?.value || "";
      const card = await generateWeatherCard({
        city,
        region,
        country,
        tempC: Number.parseInt(current.temp_C, 10) || 0,
        feelsC: Number.parseInt(current.FeelsLikeC, 10) || 0,
        condition: current.weatherDesc?.[0]?.value || "Unknown",
        humidity: Number.parseInt(current.humidity, 10) || 0,
        windKph: Number.parseInt(current.windspeedKmph, 10) || 0,
        uv: Number.parseInt(current.uvIndex, 10) || 0,
        localTime: (current.localObsDateTime || "").split(" ").slice(1).join(" "),
      });

      return sock.sendMessage(jid, {
        image: card,
        caption: `🌤️ *${city}* — ${current.weatherDesc?.[0]?.value || ""} · ${current.temp_C}°C`,
      }, { quoted: msg });
    } catch (err) {
      console.error("[weather]", err.message);
      return sock.sendMessage(jid, {
        text: `❌ City "${text.trim()}" was not found or weather data is unavailable.`,
      }, { quoted: msg });
    }
  },
};
