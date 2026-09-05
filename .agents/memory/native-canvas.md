---
name: Native canvas dependency
description: Environment-specific validation note for the bot’s image-rendering plugins.
---

The DBZ and economy image-rendering features depend on the native `canvas` binary. In a fresh workspace, package installation with lifecycle scripts disabled can leave `canvas.node` unavailable even though JavaScript syntax checks and the plugin registry still load successfully.

**Why:** Plugin loading catches renderer import failures and continues, which can make the bot appear healthy while image-based commands fall back or fail.

**How to apply:** When validating image-rendering changes, run the project-local dependency install/rebuild with native lifecycle scripts enabled and confirm the `canvas` binary exists before testing rendered battle scenes.