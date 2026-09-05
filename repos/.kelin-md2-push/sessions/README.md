# sessions/

This folder is created automatically on first bot startup.

## What's in here

```
sessions/
└── auth/
    ├── creds.json           ← Main WhatsApp credentials (most important)
    ├── pre-key-*.json       ← Signal protocol pre-keys
    ├── session-*.json       ← Per-chat session keys
    ├── sender-key-*.json    ← Group sender keys
    └── app-state-sync-*.json
```

## Rules

- **Never commit this folder to GitHub** — it contains your WhatsApp auth keys.
  The `.gitignore` already excludes it.
- **Back it up** from your panel's file manager after a successful pairing.
  If you lose these files your bot gets logged out and you need to re-pair.
- **To re-pair:** delete everything inside `sessions/auth/` and restart the bot.

## How pairing works

1. Bot starts → checks if `sessions/auth/creds.json` exists and `registered: true`
2. If not registered → requests a pairing code from WhatsApp for your `BOT_NUMBER`
3. Code appears in the console → you enter it in WhatsApp → Settings → Linked Devices
4. Session files are saved → bot connects automatically on every future restart

## Environment variables needed on your panel

| Variable       | Example value   | Description                        |
|----------------|-----------------|------------------------------------|
| `BOT_NUMBER`   | `263719809572`  | Your number — no `+`, no spaces    |
| `OWNER_NUMBER` | `263719809572`  | Who can run owner-only commands    |
| `BOT_NAME`     | `KELIN MD`      | Bot display name                   |
| `PREFIX`       | `.`             | Command prefix                     |
