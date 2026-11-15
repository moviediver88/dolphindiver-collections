# WatchNest v0.5.0 RC2 — staging validation only

This archive corrects outdated slot tests from RC1; the runtime slot implementation is unchanged. It is NOT production-ready or live-Stremio verified.

## Local checks
- Node 22 syntax checks on server.js, store.js and dynamic.js: pass.
- test/slots.test.js: 3/3 pass after aligning test expectations with the 12-slot implementation.
- Database-backed tests are blocked: @electric-sql/pglite is not installed in this environment.

## Live verification required
1. Create a NEW private GitHub repository or branch for staging, not the live branch.
2. Create a separate Render web service with a NEW Postgres database. Do not use the production DATABASE_URL.
3. Configure new APP_SECRET (32+ random characters), DATABASE_URL, and PUBLIC_URL as described in DEPLOY.md.
4. Create disposable WatchNest user; install its staging manifest into a separate Stremio TEST account.
5. Verify movie and series catalogs, collection rename/add/delete/reorder, catalog refresh behavior, empty slots, search, and privacy between two test users.
6. Only consider a production rollout if all checks pass. Stremio may cache catalog responses; automatic updates cannot be guaranteed without live testing.

Do not share personal manifest tokens or database secrets.
