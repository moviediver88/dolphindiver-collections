# WatchNest 0.5.0 navigation feasibility prototype

## Status: NOT FOR DEPLOYMENT

This is an experimental copy of the original 0.4.0 source. Do not upload it to the production GitHub repository or deploy it to Render.

## What works in the prototype

- One stable Stremio `series` catalog named `My WatchNest Collections`.
- Catalog response is generated from current account collections, so renames do not require a changed manifest.
- Synthetic collection metadata uses stable IDs scoped to the personal installation token.
- Existing per-collection catalog endpoint remains in the source for comparison.

## Blocking limitation

The collection tiles are synthetic `series` entries. Stremio's protocol does not provide a general nested-catalog navigation operation when a user selects a metadata tile. The detail has an external WatchNest website link, but does not show saved titles as a native Stremio catalog. This is **not** a replacement for the working 0.4.0 experience.

## Tests

`node --test navigation.test.js` (4 unit tests). Syntax checks: `node --check server.js` and `node --check navigation.js`.

The original integration suite was not run here; it assumes the older manifest layout and requires the database test dependency. Live Stremio compatibility has not been tested.

## Recommendation

Keep 0.4.0 deployed. Do not publish this prototype. A production solution must demonstrate that selecting a collection displays its actual movies/TV inside Stremio, preserves separate accounts, and works after a rename without reinstalling.
