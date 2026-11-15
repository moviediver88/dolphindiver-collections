# WatchNest 0.5.0 RC1 — NOT LIVE-VERIFIED

This is a locally checked release candidate, not a confirmed final production build. Do not overwrite the working v0.4.0 deployment without staging and checking a test account.

## Design

The installed manifest stays unchanged as users rename, add, or delete collections. It contains two dynamic all-titles catalogs (Movies and TV Shows) and 12 numbered collection slots for each type. The server resolves each slot from the current collection order when requested. Search `collection:Movies` in the all-titles catalog to filter by a collection's current name.

## Known trade-offs

* Collection names in the Stremio catalog dropdown are generic (Collection 01 etc.).
* Reordering collections changes which collection a numbered slot displays. This is by design and is not suitable for users expecting fixed slot identity.
* Only the first 12 collections have individual slots; all titles remain available in the two all-titles catalogs.
* Stremio itself may cache catalog responses, so instantaneous updates are not guaranteed.
* This build has NOT been tested against a live Stremio client or database. The project's database-backed integration suite could not run in this environment because dependencies could not be installed.
* Do not change the production database or Render deployment until staged tests succeed.

## Local checks completed

JavaScript syntax checks on server.js, store.js and dynamic.js, and 4 smoke assertions for catalog definitions and slot parsing.

## Suggested staging test

Deploy to a separate Render service with a separate Postgres database and new APP_SECRET; create a disposable WatchNest user, install its link in a test Stremio account, then test rename, add/delete, reorder, movie and TV browsing, and stale-cache behavior. Do not point staging at the live database.
