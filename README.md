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
| `PREFIX` | ❌ | Command prefix (default: `.`) |
| `TZ` | ❌ | Timezone (default: `Africa/Lagos`) |

On **Pterodactyl / katabump** you can paste these directly into the panel's **Startup → Environment Variables** tab instead of using a `.env` file.

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
| `download` | `.ytdl` `.ytmp3` `.tiktok` `.comic` `.manga` `.manhwa` `.mangainfo` |
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
  download/           ← Media, comic, and manga downloads
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
- **AI commands** (`.chatgpt`, `.gemini`, `.deepseek`, and Akira auto-replies): use their configured public AI routes without a user API key. Akira uses PrinceTech's `gpt4o-mini`, `gpt4`, then `gpt` endpoints and stays silent if all three fail instead of sending a fabricated reply.
- **Akira continuity**: Akira remembers each sender by their normalized WhatsApp JID in MongoDB, including their saved name and recent conversation turns. Memory survives restarts and can be cleared with `.akira reset`; `.akira info` shows the saved message count.

---

© KELIN MD
