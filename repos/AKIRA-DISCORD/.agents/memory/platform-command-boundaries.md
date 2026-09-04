---
name: Platform command boundaries
description: Rules for sharing the WhatsApp plugin tree with the Discord companion.
---

The Discord companion should load only commands that have a real Discord implementation; WhatsApp-only JIDs, message formats, group events, and media controls should be excluded rather than advertised.

**Why:** Shared plugin discovery makes unsupported WhatsApp commands appear available in Discord, where they fail confusingly or expose the wrong platform concept.

**How to apply:** Use explicit Discord support filtering for the command inventory, preserve platform-specific command names such as `.link` for server invites, and use native Discord guild permissions for moderation.