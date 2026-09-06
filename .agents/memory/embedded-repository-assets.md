---
name: Embedded repository assets
description: Asset lookup behavior when nested bot repositories are removed or kept as standalone checkouts
---

When a nested bot repository is removed from the main workspace, shared helpers must search the canonical root asset directory explicitly rather than relying only on relative assets inside the deleted checkout.

**Why:** The Discord economy preview helper fell back to a remote URL after the duplicate nested Kelin-MD2 checkout was removed, even though the same preview artwork still existed in the root workspace.

**How to apply:** Before deleting an embedded repository, audit imports and relative asset directories. Prefer a shared root asset lookup, while retaining a nested/standalone lookup for deployments where the bot repository runs independently.