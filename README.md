# KELIN MD ⚡

Premium WhatsApp Multi-Device Bot — pairing code login, 30+ plugins, 76+ commands.

---

## 🚀 Deploy on a Hosting Panel (Pterodactyl / katabump / bothosting)

### 1. Install
```
npm run install:panel
```

This uses npm's public registry and disables package-lock generation, which is
the most reliable option on Pterodactyl/Katabump.

Do **not** use `npm install origin/main` as the install command. `origin/main`
is a Git branch name, not an npm package or repository URL, and npm will try to
clone the invalid repository `ssh://git@github.com/origin/main.git`.

If your hosting panel has separate repository settings, use:

```
Repository: https://github.com/kelin132/Kelin-MD2.git
Branch: main
```

If the panel keeps using an old or private npm mirror, run:
```
npm run install:panel
```
This installs the Shazam and sticker dependencies, including the sticker image codec.

### 2. Set environment variables
Copy `.env.example` to `.env` and fill in your details:

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_NUMBER` | ✅ | Your WhatsApp number with country code, no `+` (e.g. `2348012345678`) |
| `OWNER_NUMBER` | ✅ | Your number for owner-only commands (same format) |
| `BOT_NAME` | ❌ | Display name (default: `KELIN MD`) |
| `AI_PERSONA` | ❌ | AI personality: `akira`, `zhongli`, or `tsaritsa` |
| `AI_TRIGGER_NAMES` | ❌ | Optional comma-separated names that trigger the active persona |
| `PREFIX` | ❌ | Command prefix (default: `.`) |
| `TZ` | ❌ | Timezone (default: `Africa/Lagos`) |

On **Pterodactyl / katabump** you can paste these directly into the panel's **Startup → Environment Variables** tab instead of using a `.env` file.

### AI personalities

All deployed bots can run from the same repository while using different personalities. Set these variables separately on each deployment:

```env
# Akira deployment
BOT_NAME=AKIRA MD
AI_PERSONA=akira
AI_TRIGGER_NAMES=akira,akira md
```

```env
# Zhongli deployment
BOT_NAME=ZHONGLI MD
AI_PERSONA=zhongli
AI_TRIGGER_NAMES=zhongli,zhongli md,consultant
```

```env
# Tsaritsa deployment
BOT_NAME=TSARITSA MD
AI_PERSONA=tsaritsa
AI_TRIGGER_NAMES=tsaritsa,tsaritsa md,her majesty
```

The active persona responds when its name is written, when the bot is mentioned, or when someone replies to one of its messages. Conversation history is separated by persona and chat, so switching deployments does not mix character memories. Persona replies use `FREEMODEL_API_KEY` as the fast primary provider and fall back to the PrinceTech Gemini endpoint when the primary is missing, unavailable, or times out. Set `PRINCE_API_KEY` in the deployment environment for `.flux` image generation and the Akira fallback. Use `.akira info` to see the active persona and `.akira reset` to clear its conversation in the current chat; the legacy command name remains for compatibility.

### 3. Start
```
node index.js
```

Or set your panel's **Start Command** to:
```
node index.js
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
| `dragonball` | `.dbzstart` `.dbzselect` `.dbzpick` `.dbzprofile` `.dtrain` `.dlearn` `.dbzfight` `.dbzbattle` `.dbzchallenge` `.dbzheal` `.dbzsync` `.dchar` `.dleaderboard` |

---

### Dragon Ball Z command flow

1. `.dbzstart` — create a fighter.
2. `.dbzselect [page]` then `.dbzpick <number or name>` — browse and choose a character.
3. `.dprofile` or `.dbzprofile` — view fighter stats.
4. `.dtrain`, `.dlearn`, and `.dbzheal` — grow and recover your fighter.
5. `.dbzfight` — engage a spawned villain.
6. `.dbzchallenge @user` — start a PvP battle.
7. `.dbzbattle fight <move number>` or `.dbzbattle run` — take a turn or flee.
8. `.dbzsync` — owner-only roster refresh from the Dragon Ball API.

Battle, transformation, villain-arrival, victory, and roster-selection images now crop transparent character art to its visible silhouette and anchor it to the arena floor for consistent cutouts.

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
