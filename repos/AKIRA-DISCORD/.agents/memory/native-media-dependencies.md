---
name: Native media dependencies
description: Runtime requirements for the bot's native image-processing packages.
---

Native packages such as `canvas` and `sharp` must be installed with lifecycle scripts enabled, and container images must include their runtime shared libraries.

**Why:** A dependency install with scripts disabled can look successful while plugin loading later fails when a native module is imported; the slim runtime image also needs the libraries that the native bindings dynamically load. Some panels deploy source without `.git`, so Git-based update checks are unavailable there.

**How to apply:** Preserve normal npm install scripts for deployment, keep the builder/runtime system packages aligned whenever media plugins are changed, and run the bootstrap before importing application modules when hosts may invoke `node index.js` directly. For archive-only panels, use a remote commit marker to avoid redownloading the same source on every restart.