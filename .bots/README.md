# Multi-bot setup

The simple setup is one folder per WhatsApp account. Put that account's
`cred.json` or `creds.json` inside the folder:

```text
.bots/
├── elyra/
│   └── cred.json
└── viora/
    └── cred.json
```

That is enough. You do not need a JSON config file. The folder name becomes the
bot name, and the server automatically checks `.bots/` every 10 seconds.

If your old credentials are inside an `auth` folder, this also works:

```text
.bots/
└── elyra/
    └── auth/
        └── cred.json
```

Each WhatsApp account must have its own folder and its own credential file.
Do not use one credential file for two accounts.

For a new account with no credential file yet, use the optional config format:
`.bots/elyra.json`

```json
{
  "id": "elyra",
  "sessionFolder": ".bots/elyra",
  "phoneNumber": "2637xxxxxxxx",
  "ownerNumber": ["2637xxxxxxxx"],
  "prefix": "!"
}
```

Use the phone number with country code, without `+`, spaces, or dashes. The
pairing code appears in the workflow logs. QR login is disabled.

The server copies legacy `cred.json` to Baileys' `creds.json` automatically.
Credentials are private and should never be committed to GitHub.