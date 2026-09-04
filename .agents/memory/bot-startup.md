---
name: Bot startup behavior
description: Multi-bot startup depends on valid .bots definitions and can be confused by malformed JSON.
---

Treat any non-documentation entry inside `.bots/` as an intentional multi-bot configuration. A malformed bot definition must keep the supervisor path active and report the configuration error instead of starting the legacy single-bot account.

**Why:** A malformed `.bots/<id>/config.json` previously produced zero definitions, and a configured `BOT_NUMBER` caused the launcher to fall back to single-bot startup. The panel then appeared slow while loading the wrong account.

**How to apply:** When diagnosing startup, check for a `[bots] Found ...` message before investigating MongoDB or plugin load time. Validate each bot config as strict JSON and ensure its sessionFolder points to the actual credential directory.