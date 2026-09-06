---
name: Discord channel state
description: How Discord channel identifiers interact with the WhatsApp compatibility layer and shared gameplay state.
---

Discord commands may expose a WhatsApp-shaped compatibility JID for legacy group checks, but card and Pokémon spawn/battle state must use the native Discord channel ID.

**Why:** Automatic spawners key their in-memory state by Discord channel ID. Using the compatibility JID in `.claim`, `.catch`, or battle commands makes active spawns appear missing even though they exist.

**How to apply:** Preserve the compatibility JID where legacy plugins need WhatsApp group semantics, and pass the native Discord channel ID separately for all channel-scoped state lookups and writes.