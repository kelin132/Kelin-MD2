# KELIN MD ⚡

Premium WhatsApp Multi-Device Bot — pairing code login, 30+ plugins, 76+ commands.

---

## 🚀 Deploy on a Hosting Panel (Pterodactyl / katabump / bothosting)

### 1. Install
```
npm install
```

### 2. Set environment variables
Copy `.env.example` to `.env` and fill in your details:

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_NUMBER` | ✅ | Your WhatsApp number with country code, no `+` (e.g. `2348012345678`) |
| `OWNER_NUMBER` | ✅ | Your number for owner-only commands (same format) |
| `BOT_NAME` | ❌ | Display name (default: `KELIN MD`) |
| `PREFIX` | ❌ | Command prefix (default: `.`) |
| `TZ` | ❌ | Timezone (default: `Africa/Lagos`) |

On **Pterodactyl / katabump** you can paste these directly into the panel's **Startup → Environment Variables** tab instead of using a `.env` file.

### 3. Start
```
node index.mjs
```

Or set your panel's **Start Command** to:
```
node index.mjs
```

---

## 📱 First-Time Pairing

On first run (no saved session) the pairing code will appear in the console:

```
╔══════════════════════════════════════════╗
║          KELIN MD — PAIRING CODE          ║
╠══════════════════════════════════════════╣
║   Code   :  ABCD-WXYZ                    ║
║   Number : +2348012345678                ║
╠══════════════════════════════════════════╣
║  HOW TO PAIR:                             ║
║  1. Open WhatsApp on your phone           ║
║  2. Tap Settings → Linked Devices         ║
║  3. Tap  Link a Device  →  OK             ║
║  4. Enter the code shown above            ║
╚══════════════════════════════════════════╝
```

Once paired the session is saved in `sessions/auth/`. The bot will reconnect automatically after that — no pairing needed again unless you log out.

---

## 🔌 Plugin System

Plugins are hot-reloadable `.js` files in `plugins/<category>/`. Add a new one without restarting:

```js
// plugins/fun/hello.js
export default {
  name: "hello",
  description: "Say hello",
  category: "fun",
  usage: ".hello",
  aliases: ["hi"],
  cooldown: 3,
  isOwner: false,
  isAdmin: false,
  isPremium: false,
  version: "1.0.0",
  async run({ sock, msg }) {
    await sock.sendMessage(msg.key.remoteJid, { text: "Hello! 👋" });
  },
};
```

### Plugin Categories

| Category | Commands |
|----------|----------|
| `main` | `.ping` `.alive` `.menu` `.info` `.runtime` |
| `ai` | `.chatgpt` `.gemini` `.deepseek` |
| `download` | `.ytdl` `.ytmp3` `.tiktok` |
| `fun` | `.joke` `.dare` `.truth` `.quote` |
| `games` | `.ttt` |
| `group` | `.welcome` `.goodbye` `.antilink` |
| `admin` | `.kick` `.promote` `.demote` |
| `owner` | `.broadcast` `.eval` |
| `media` | `.sticker` `.qr` |
| `search` | `.google` `.wiki` `.weather` |
| `utilities` | `.calc` `.translate` |
| `anime` | `.waifu` |

---

## 🗂 File Structure

```
index.mjs             ← Main entry point (run this)
.env.example          ← Config template
lib/
  bot.mjs             ← WhatsApp connection + pairing
  pluginManager.mjs   ← Plugin loader & message router
  logger.mjs          ← Console logger
plugins/
  main/               ← Core commands
  ai/                 ← AI commands
  download/           ← Media download
  fun/                ← Fun & games
  group/              ← Group management
  admin/              ← Admin commands
  owner/              ← Owner-only
  media/              ← Stickers, QR
  search/             ← Search commands
  utilities/          ← Utilities
  anime/              ← Anime content
sessions/
  auth/               ← WhatsApp session (auto-created)
```

---

## ⚙️ Requirements

- Node.js 20+
- npm 9+ (or pnpm 8+)

---

## 📝 Notes

- **Session persistence**: `sessions/auth/` is created automatically. Keep it backed up.
- **Re-pairing**: Delete `sessions/auth/` and restart to re-pair.
- **Owner commands**: Set `OWNER_NUMBER` — without it owner plugins won't work.
- **AI commands** (`.chatgpt`, `.gemini`): Require API keys — set them in `.env` (see plugin files for variable names).

---

© KELIN MD
