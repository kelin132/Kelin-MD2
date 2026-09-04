---
name: WhatsApp identity bridge
description: Constraints for keeping bot and website accounts aligned across WhatsApp JID/LID formats.
---

Resolve privacy LIDs through Baileys' native lidMapping before database-backed command handlers run. Website lookups must accept raw numbers, @s.whatsapp.net, @c.us, and device-qualified forms.

**Why:** WhatsApp can expose a privacy LID instead of the phone JID, while older Mongo records may use several phone/JID spellings. Treating the new value as a fresh account can hide progress or create duplicates.

**How to apply:** Keep the website and bot identity variant lists in sync. MongoDB `_id` is immutable, so an LID-to-JID migration must copy only when the destination is absent, then remove the old key; never `$set` `_id`.