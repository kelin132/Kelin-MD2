---
name: GitHub push authentication
description: The authentication header format that works for GitHub fetch and push from this workspace.
---

Use a GitHub token through an HTTP Basic authorization header with username `x-access-token` when bearer authorization is rejected:

```sh
BASIC=$(printf 'x-access-token:%s' "$GITHUB_TOKEN" | base64 -w0)
git -c http.extraheader="AUTHORIZATION: basic $BASIC" fetch ...
git -c http.extraheader="AUTHORIZATION: basic $BASIC" push ...
```

**Why:** The same configured token returned a GitHub 401 with bearer authorization but succeeded with the Basic header format.

**How to apply:** Keep the token inside the environment and never print the header or token; verify the remote commit with authenticated `git ls-remote` after pushing.