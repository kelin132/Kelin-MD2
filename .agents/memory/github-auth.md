---
name: Secure GitHub sync
description: How this project handles GitHub push authentication and divergent repository history
---

Use the workspace secret flow for `GITHUB_TOKEN`; never paste tokens into chat or commit them. When the local and remote branches have different histories, preserve a local backup and base the final commit on the current remote branch rather than force-pushing.

**Why:** A stale token was rejected during a push, and the repository histories had diverged. Secure secret refresh plus a remote-based fast-forward avoided exposing credentials or overwriting newer GitHub work.

**How to apply:** Request or refresh `GITHUB_TOKEN` through workspace secrets, fetch the target branch, verify the intended files are present, and push normally. If GitHub API validation succeeds but git rejects Bearer auth, use an ephemeral `x-access-token` Basic header without writing the token to git config. Treat MongoDB credentials separately from GitHub authentication.