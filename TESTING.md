# Validation for v0.3.0

Local validation performed while preparing this package on October 29, 2026.

## Automated integration tests

`npm test`: 11 tests passed on Node.js 24.22.1 using PGlite 0.5.13 as a PostgreSQL-compatible test engine. The deployed runtime target is Node.js 22 or newer.

Covered flows:

- Account registration, starter collections, private sessions, and same-origin enforcement.
- Search, adding canonical metadata, duplicate prevention, and movie/series type boundaries.
- Separate per-user manifest IDs and read-only personal feeds.
- Cross-account attempts to read feeds, rename/delete collections, add titles, or change memberships rejected.
- Title copying/removal and automatic Movies/TV Shows behavior.
- Collection rename/order and export without credentials.
- App restart with the database retained; sessions, data and feed links remain valid.
- Installation-link replacement revokes old read access.
- One-use recovery and old-session revocation.
- Logout, account deletion, cascading item deletion, and persistent rate limits.

Test metadata is stubbed for deterministic results. These tests do not contact a real Neon database or a Stremio client.

## Browser flow check

Chromium browser checks passed at desktop (1440 × 1000) and phone (390 × 844) widths:

- Sign up, display and acknowledge a recovery code.
- Create a collection, search for a movie and series, add titles and copy to another collection.
- Open the personal installation dialog and fetch its generated manifest.
- Check that the installation URL is cleared when the dialog closes.
- Sign in on a phone layout, open account settings, change password and sign in again.
- Check for horizontal page overflow and page JavaScript errors; none found in these flows.

Title metadata was stubbed during browser flows. Third-party poster requests were not verified as part of the browser test.

## External provider checks

A live Cinemeta movie search for Iron Man and a metadata lookup for tt0371746 returned the expected title/ID. This is a smoke check, not a guarantee of service uptime or coverage.

## Dependency check

`npm audit --omit=dev` reported no known production dependency vulnerabilities when this package was built. This is not an independent security audit or a promise that no vulnerabilities exist.

## Deployment checks still required

Follow DEPLOY.md to verify a real hosted PostgreSQL connection, persistence across a Render redeploy, account isolation in the deployed environment, and Windows/onn Stremio installation and browsing. Do these before inviting a wider audience.

## Version 0.2 additions

Local tests cover advertised genre options, matching and nonmatching genres, combined search/pagination, backfill of old null-genre titles, and conversion of automatic collections with ownership checks and retained memberships. Client dropdown behavior still needs deployment testing.

## Generic setup checks

A separate generic test covers four manual new-account lists, no automatic classification into Movies/TV Shows, Specials/Music mixed types, copying, encoded My Watchlist URLs, ownership isolation and migration from the previous user schema while retaining household names, items and installation links.
