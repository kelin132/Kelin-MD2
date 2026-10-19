# Account data and panel updates

## Discord sharing, short claims and one lottery entry

Update both Kelin-MD2 and AKIRA-DISCORD together. They must use the same
`kelin_md` database and verified active `account_links` records. Collection
lookups now also include linked Discord ownership keys, so both bots can read
the same cards, pending cards and Pokémon without copying users or changing
original account IDs.

Card claim codes are stable eight-character uppercase alphanumeric values,
shared across both implementations. Long API IDs are retained internally.
Old claim IDs/card IDs/indexes remain accepted for existing pending cards.

Lottery entry writes use one atomic conditional append on the shared round,
matching verified WhatsApp/LID/Discord aliases. Concurrent duplicate attempts
cannot create a second ticket; rejected charged attempts refund their debit.
Draws share a lock with entry writes and reset the round identity when finished,
allowing one new entry after a draw. Ticket prices and prizes are unchanged.

The old generic `mn_users.userId = "discord"` bucket is preserved, but not
automatically attributed to any player because the former Discord ID parser
could mix different users there. Only independently verified ownership keys
are used for shared reads.

Fixture tests exercise actual commands, both purchase directions, concurrency,
legacy keys, and post-draw re-entry. They do not access production MongoDB.
If a draw fails after locking, reconcile payouts before clearing the lock;
blind automatic retries could award a prize twice.

## Account identity

Existing `users._id` values and unique `websiteId` values are retained. Verified
LID/phone mappings are stored as aliases instead of copying and deleting user
accounts. Economy saves and website-ID commands resolve the original account.
No unique index is dropped, no website IDs are regenerated, and balances or
collections are not reset by this fix.

The website reads Pokémon and cards under the verified aliases, including
legacy card users keyed by `_id`. Deploy the website changes together with the
bot changes. Existing accounts whose LID-to-phone mapping was never stored
must interact with the bot after WhatsApp supplies that verified mapping;
the website deliberately does not guess phone numbers from privacy LIDs.

Bot collection readers also use the economy account resolver: `mn_users`
looks up legacy/full/numeric ownership keys and combines matching card records,
while Pokémon trainer/party/PC/count readers use the same verified aliases.
An empty phone-keyed record cannot hide a populated legacy collection. Card
saves retain each copy in its original document, and trainer writes target the
resolved trainer rather than a newly invented phone-keyed account.

## MongoDB maintenance

Performance-index setup runs in the background and checks existing index keys
before building missing ones. Successful `createIndexes` operations are not
reported as slow user queries; failed operations still produce warnings.
An initial index build can still take time on a large collection. This change
does not claim to repair MongoDB hosting capacity or remove existing data.

## Hosting-panel updates

Git and npm must be installed and the bot directory must be writable.
Startup and `.update` use the same updater. Archive installations initialize
Git in the bot directory and establish the configured branch/upstream.
`GITHUB_BRANCH` defaults to `main`.

Updates replace tracked application code with the upstream revision; local
edits to tracked code are not retained. Complete `.env` files, session stores,
`.bots`, `data`, `database`, and `backups` are backed up and restored. Untracked
panel files are not removed with `git clean`. Backups stay on disk if restoration
fails. Dependency-install failures are retried on the next update.

Startup executes changed code in a fresh Node process. After a manual `.update`,
restart from the panel to load core changes; plugin reload alone is insufficient.
The old unsafe ZIP replacement fallback was removed. Git failures now stop the
update and report the problem instead of replacing runtime directories.

## Regression checks

Run `node --test test/*.test.mjs` from the repository root. Focused coverage is
in `account-identity.test.mjs`, `git-updater.test.mjs`, and
`performance-indexes.test.mjs`. Tests use fixtures and local Git repositories;
they do not connect to the production database.
`collection-account-resolution.test.mjs` additionally checks actual `.col`
output, separate users, legacy numeric card keys, party/PC reads, transfers,
and saves to existing records.
