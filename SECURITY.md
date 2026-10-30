# Security notes for operators

This is beta software. Local access-control tests are included; an independent security audit has not been performed.

## Controls implemented

- Parameterized PostgreSQL queries and account ownership constraints, including composite foreign keys for collection memberships.
- Salted scrypt password hashing (N=131072, r=8, p=1, 64-byte output); two concurrent password derivations at most.
- Random 256-bit session and feed keys. Sessions and recovery codes are stored as SHA-256 hashes; stored feed-key copies use AES-256-GCM under a key derived from APP_SECRET.
- Seven-day cookie sessions, HttpOnly, SameSite=Strict, Secure under HTTPS, and same-origin checks for unsafe API requests.
- CORS only for read-only add-on endpoints. No credentialed CORS for management APIs.
- One-use recovery codes with a row lock during replacement; reset revokes existing sessions.
- Persistent IP-hash rate limits for signups, login, API activity and metadata requests. Login also has a per-username attempt counter.
- Account, collection and title quotas. Registration can be closed by the operator.
- Strict CSP, frame restrictions, no-referrer policy, and DOM text rendering for user content.
- Fixed metadata-provider URLs, validated IMDb IDs, outgoing request timeouts, response size limits and bounded metadata cache/concurrency.
- Verified remote PostgreSQL TLS certificates; do not disable certificate verification to resolve connection problems.

## Operational responsibilities

Keep database credentials and APP_SECRET in private hosting environment variables. Preserve APP_SECRET securely. Do not deploy a real .env file or commit it. Do not put user installation URLs in screenshots or public issues.

Use a dedicated database and appropriate database roles. The application creates its tables at startup and requires the privileges to do so. This beta does not implement PostgreSQL row-level security; application authorization and ownership constraints enforce separation.

Set TRUST_PROXY=1 only behind a trusted reverse proxy that appends the real forwarding information. Do not trust caller-supplied forwarded headers on a directly exposed Node port.

Sessions are cleared periodically after expiry; rate-limit rows are cleaned hourly. Monitor your hosting budgets and account quota. Public registration without email verification can still attract abuse; closing registration and reviewing a wider anti-abuse strategy may be appropriate as usage grows.

Data export is a portability feature, not a replacement for operator-managed database backups. Verify restores and retain encryption secrets separately.

Never ask users to submit passwords, recovery codes, database URLs, or personal manifest links in a public GitHub issue. Arrange a private reporting channel before broad release.

## References

- https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html
- https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- https://node-postgres.com/features/ssl
- https://stremio.github.io/stremio-addon-sdk/advanced.html
