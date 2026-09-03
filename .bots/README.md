# Multi-bot configuration

Add one JSON file per WhatsApp account in this directory. The supervisor
checks this directory at startup and every 10 seconds, so new or changed bots
are picked up without editing `index.js` or restarting the server.

Example: `.bots/elyra.json`

```json
{
  "id": "Elyra",
  "sessionFolder": ".bots/Elyra",
  "phoneNumber": "2637xxxxxxxx",
  "ownerNumber": ["2637xxxxxxxx"],
  "ownerName": "Elyra",
  "botName": "XYTHERA",
  "prefix": "!"
}
```

Use the phone number with country code, without `+`, spaces, or dashes.

- If `.bots/Elyra/creds.json` already exists, that account reconnects using it.
- If there is no saved session, the bot prints a pairing code for
  `phoneNumber`. Link it from WhatsApp → Settings → Linked devices → Link a
  device. QR login is disabled.
- Keep each bot's session folder separate.
- Set `"enabled": false` to stop a bot without deleting its definition.

You can also use `.bots/sessions.config.json` with an array of the same
objects. That file is ignored as a session credential file and is not required
when using one file per bot.