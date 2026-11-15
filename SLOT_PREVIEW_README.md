# WatchNest fixed-slot prototype — DO NOT DEPLOY TO LIVE

This is a new experimental alternative to the previous navigation prototype.

## What changed
- Added `slots.js`: 50 immutable numbered slots for each media type, 100 catalog entries in total.
- Catalog routes resolve the **current collection at that position** on every request. A rename or reorder does not require a manifest update.
- Added `Store.catalogTyped` to filter movie and series before pagination, preserving native Stremio title cards.
- Added three automated tests for stable catalog IDs and route validation.

## Important limitations
- **Not production-ready**. Stremio desktop/web live integration has NOT been tested.
- Stremio's menu shows generic slot names (Collection 01 — Movies/TV) rather than the collection's live name. Actual names appear in the separate navigation tiles but those tiles still cannot open nested catalogs directly.
- There are 100 fixed catalog entries, potentially cluttering Discover. A more refined version should let users configure a bounded set of slots before installation, which would require a one-time install for that setting.
- Collection reorder changes which content appears in each numbered slot.
- Existing account data is not modified by this code, but do not deploy it over live v0.4.0 without testing in a separate instance and test account.
- Automated tests cover slot definitions and URL parsing only, not a real database or Stremio client.

## Validation
`node --check server.js`, `node --check store.js`, `node --test test/slots.test.js` passed.
