# Privacy and account data

DolphinDiver Collections stores usernames, password hashes, recovery-code hashes, session hashes/expiry times, installation-key hashes/encrypted copies, collection names, title IDs and saved membership information in its PostgreSQL database.

The app does not request a real name, email address, Stremio password, streaming-provider credentials or payment information. Use a separate password for this service.

## Access

- Management requires an authenticated Collections session.
- Each personal installation URL grants read access to all that account's collections. Anyone who obtains it can read those lists. They cannot edit them through the read-only add-on endpoints.
- The application operator and hosting/database providers can access stored data. The service is not end-to-end encrypted.
- Rate limiting uses keyed hashes of request IP addresses and expiring counters. The application does not intentionally log personal feed URLs or submitted credentials. Hosting providers may independently retain request logs and backups; their policies apply.

## External services

Title searches and title lookups are sent from this server to Cinemeta. Poster images load from third-party image hosts in the user's browser or Stremio client. Those services receive the information needed for the request. Their availability and policies are outside this application's control.

Ko-fi links open an external site only when selected. This app does not process donations or store payment data.

## User controls

Account settings allow password changes, recovery-code replacement, installation-link replacement, a JSON data export, and account deletion. Deleting an account removes its current application database records through cascading deletion. Hosting-provider backups may retain older records under the provider's retention policy.

Session cookies expire after seven days. Password reset revokes existing sessions. Recovery codes are one-use and replaced after a successful reset. Losing both the password and recovery code cannot be resolved through an automatic email flow in this version.

Operators should publish their own contact details and update this notice to match the deployment's actual providers and retention arrangements before broad public use.
