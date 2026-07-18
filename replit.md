# KELIN MD

Premium WhatsApp Multi-Device bot with a futuristic dark dashboard, pairing-code login, hot-reloadable plugin system, and 76+ commands across 12 categories.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the bot + API server (port 8080)
- `pnpm --filter @workspace/kelin-md run dev` — run the dashboard UI
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas
- `pnpm run typecheck` — full typecheck across all packages

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Bot: @whiskeysockets/baileys (WhatsApp Multi-Device)
- API: Express 5
- Frontend: React + Vite + Tailwind CSS + Framer Motion + Recharts
- Auth: WhatsApp Pairing Code (no QR)
- Validation: Zod (OpenAPI-first)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/api-server/src/lib/bot.ts` — Baileys WhatsApp connection manager
- `artifacts/api-server/src/lib/pluginManager.ts` — hot-reloadable plugin system
- `artifacts/api-server/src/lib/logBuffer.ts` — in-memory log ring buffer
- `artifacts/api-server/src/lib/settingsManager.ts` — settings R/W (JSON)
- `artifacts/api-server/src/routes/` — all API route handlers
- `artifacts/kelin-md/src/` — React dashboard frontend
- `plugins/` — all bot plugins (categorized subdirectories)
- `config/settings.json` — bot configuration
- `database/` — JSON data files
- `sessions/` — WhatsApp session files (auto-created)

## Plugin System

Plugins are hot-reloadable `.js` ESM files in `plugins/<category>/`:

```js
export default {
  name: "ping",
  description: "Check if bot is alive",
  category: "main",
  usage: ".ping",
  aliases: ["p"],
  cooldown: 3,
  isOwner: false, isAdmin: false, isPremium: false,
  async run({ sock, msg, args, text, sender }) {
    await sock.sendMessage(msg.key.remoteJid, { text: "Pong!" });
  },
};
```

Hot reload: Dashboard > Plugins > Reload All (or `POST /api/plugins/reload`)

## Pairing Flow

1. Open dashboard → Pairing page
2. Enter phone number with country code (+1234567890)
3. Enter the 8-character code in WhatsApp: Settings > Linked Devices > Link Device
4. Bot connects and auto-saves session

## Plugin Categories

| Category | Dir | Commands |
|----------|-----|----------|
| Main | plugins/main | ping, alive, menu, info, runtime |
| Group | plugins/group | welcome, goodbye, antilink |
| Admin | plugins/admin | kick, promote, demote |
| Owner | plugins/owner | broadcast, eval |
| AI | plugins/ai | chatgpt, gemini, deepseek |
| Download | plugins/download | ytdl, ytmp3, tiktok |
| Fun | plugins/fun | joke, dare, truth, quote |
| Media | plugins/media | sticker, qr |
| Search | plugins/search | google, wiki, weather |
| Utilities | plugins/utilities | calc, translate |
| Games | plugins/games | ttt |
| Anime | plugins/anime | waifu |

## Architecture decisions

- **Plugin hot-reload via ESM cache-busting**: Dynamic `import(`${path}?v=${Date.now()}`)` — no restart needed
- **Baileys externalized from bundle**: Added to esbuild externals to avoid bundling issues with its native deps
- **Single process**: Bot and API server run in the same Node.js process — no separate bot daemon needed
- **JSON settings**: config/settings.json for bot config (simpler than DB for single-instance bots)
- **Security**: File manager API restricts access to `plugins/`, `config/`, `database/`, `logs/`, `sessions/` only

## API Endpoints

All under `/api`:
- `GET /bot/status` — bot stats (connected, RAM, CPU, users, groups, commands, plugins)
- `POST /bot/pair` — request WhatsApp pairing code
- `GET /bot/session` — session info
- `DELETE /bot/session` — logout
- `POST /bot/restart` — reconnect bot
- `GET /plugins` — list all plugins
- `POST /plugins/reload` — hot-reload plugins
- `PATCH /plugins/:id/toggle` — enable/disable plugin
- `GET /commands` — list all commands
- `GET /logs` — console logs (filter by level)
- `GET /files` — file manager
- `GET /settings` / `PUT /settings` — bot configuration
- `POST /backup` / `GET /backups` / `POST /restore` — backup/restore

## User preferences

- Bot name: KELIN MD
- Developer: Kelin
- Footer: © KELIN MD
- Theme: Dark, futuristic neon blue/purple with glassmorphism

## Gotchas

- Set `ownerNumber` in Settings before using owner-only commands
- AI commands (ChatGPT, Gemini) require API keys set in `config/settings.json`
- After plugin changes on disk, use "Reload All" in the Plugins page — no restart needed
- `sessions/auth/` is created automatically on first pairing
