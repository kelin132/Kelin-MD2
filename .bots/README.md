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

Only registered sessions are started in `.bots`; pairing codes are disabled in
multi-bot mode. For a new account, create and pair the session outside the
`.bots` supervisor first, then place the complete registered Baileys auth folder
under its bot directory.

For an existing account with a config file, use:
`.bots/elyra/config.json`

```json
{
  "id": "elyra",
  "sessionFolder": ".bots/elyra",
  "ownerNumber": ["2637xxxxxxxx"],
  "prefix": "!"
}
```

The `sessionFolder` field is optional. If credentials are in `.bots/elyra/auth/`,
that folder is used directly; the server does not create a second session
folder or rename/copy credential files. Use exactly one credential file per
session: either `cred.json` or `creds.json`. The bot reads and updates that
existing file and keeps all session key files in the same existing folder.
Credentials are private and should never be committed to GitHub.