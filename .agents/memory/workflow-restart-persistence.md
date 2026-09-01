---
name: Workflow restart persistence
description: Workflow restarts can reconcile away uncommitted workspace changes in this bot project.
---

Preserve substantial bot changes in a git commit before restarting the configured workflow.

**Why:** A workflow restart once restored the prior workspace state and removed an uncommitted implementation batch.

**How to apply:** Verify the commit and clean status before restarting; re-run registration and syntax checks after the restart.