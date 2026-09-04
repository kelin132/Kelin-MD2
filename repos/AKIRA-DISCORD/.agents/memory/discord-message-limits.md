---
name: Discord message limits
description: Cross-platform output constraints for commands shared with WhatsApp.
---

Commands shared with WhatsApp must paginate long text before sending through Discord; keep individual Discord messages below 2,000 characters.

**Why:** WhatsApp accepts the bot's full command atlas in one message, while Discord rejects oversized content and the generic error handler hides the API rejection from users.

**How to apply:** Use platform-specific pagination for large menus and guides, leaving media-rich WhatsApp formatting in the WhatsApp path.