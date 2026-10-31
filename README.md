# WatchNest by DolphinDiver

### Your next watch, organized.

Create your own movie and television collections and display them in **Stremio → Discover → My Watchlist**.

**Version 0.3.0 · Public beta software · Personal collections for separate accounts**

## What it does

- Create a separate WatchNest account; no Stremio password is required.
- Search movies and television by title, with metadata from Cinemeta.
- Create and rename collections, set their order, and save titles in several collections.
- Add or remove titles from the management webpage.
- Install a private, read-only feed in Stremio using a personal manifest link.
- Keep each user's saved lists separate in PostgreSQL.
- Recover an account with a private, one-use recovery code.
- Export a JSON copy of your collections and saved titles.

### Starter catalogs for new accounts

| Catalog | Contents |
| --- | --- |
| TV Shows | Manually saved television series |
| Movies | Manually saved movies |
| Specials | Manually selected standalone specials, indexed as movies or series |
| Music | Manually selected concert films, music documentaries or music videos indexed as movies or series |

New accounts use **My Watchlist** as their Discover type. Nothing is added automatically. Saving a movie in Specials does not put it in Movies; use **Also save to…** if you want it in both. Music is not an audio song or album library. Search results depend on Cinemeta; not every special or music video is available.

Existing accounts keep their names, ordering, collection memberships and **WatchNest** Discover type. The Mark/Velma household layout is not installed in other people's accounts. All collections can be renamed; users can create their own lists. Older automatic collections remain automatic until converted using **Make this a regular collection**.

## How people use it

1. Open the deployment's public website or `/configure` page.
2. Create a WatchNest account with its own username and password.
3. Save the recovery code somewhere private. There is no email recovery in this version.
4. Search for titles and add them to a collection.
5. Choose **Install in Stremio**, or copy the personal manifest link into Stremio's add-on search or Addon Manager.
6. Open **Discover → My Watchlist** in Stremio.
7. Select a collection, then use its genre dropdown to filter your saved titles.

Other people visit the same public website and create their own accounts. They must not install someone else's personal link unless they intend to share that person's collections.

## What it does not change

This is a **catalog add-on**, not a modification to Stremio's Library screen. Clicking Add to Library in Stremio does not add a title here. Add and organize titles on the Collections webpage.

Stremio catalogs are flat. **Watch Later — Movies** and **Watch Later — TV Shows** provide two choices, not actual nested folders.

The add-on does not host videos or supply streams. Keep your usual metadata provider, such as Cinemeta, installed for full details and episode lists; playback depends on your other installed add-ons.

## Updating what Stremio shows

- Changes to titles use the existing personal link. Switch catalogs and back, or restart Stremio, to refresh stale content.
- After creating, deleting, renaming, or reordering collections, reinstall using the **same personal link** if Stremio retains its old menu. Existing clients may cache manifest data.
- Replacing the installation link disables the old link. Every device using the old link must then be reinstalled with the replacement.

## Private access

A personal installation link is a **read-access key** to all that account's collections. Keep it private; do not post it in a public directory. It cannot sign in to the management webpage or edit lists. Use Account → Replace installation link if it has been exposed.

Passwords are salted and hashed with scrypt. Session cookies are HttpOnly and SameSite=Strict, and Secure on HTTPS. Sessions and recovery codes are stored as hashes; stored feed keys are encrypted with APP_SECRET. Database queries enforce account ownership.

These measures do not make the data end-to-end encrypted: the service operator and hosting/database providers can access stored data. Read [PRIVACY.md](PRIVACY.md) and [SECURITY.md](SECURITY.md).

## Optional support

### [☕ Support DolphinDiver on Ko-fi](https://ko-fi.com/dolphindiver)

The add-on is free. Donations are optional and do not buy movies, streams, or access.

## Deploy your own service

See [DEPLOY.md](DEPLOY.md). The intended setup is:

- Render Node web service, running Node.js 22 or newer.
- A persistent PostgreSQL database, such as Neon.
- Private DATABASE_URL and APP_SECRET environment variables.

No account data is stored in the GitHub repository or on Render's temporary filesystem. Registration defaults to a maximum of 200 accounts, with 50 collections and 5,000 titles per account. Operators can close registration or adjust the account ceiling. This is a small-deployment starting point, not a claim of unlimited free hosting capacity.

## Development and tests

```bash
npm ci
npm test
```

Tests use an embedded PostgreSQL-compatible PGlite database and fake title-provider responses. Production uses `pg` and a separately hosted PostgreSQL database. No PGlite or local-file data store is used in production.

For local development, set DATABASE_URL, APP_SECRET, and PUBLIC_URL in your shell, then run `npm start`. The application does not automatically load .env files. HTTP is permitted only for localhost URLs.

## Beta limitations

- No automatic import or synchronization with Stremio's existing Library.
- No email sign-in, email password reset, or email verification. Save the recovery code.
- No true subfolders, episode-level collections, drag-and-drop title ordering, or automatic JSON restore yet. JSON export is provided for portability.
- Titles are sorted by most recently added within a collection.
- Search, genres and artwork depend on Cinemeta and external image services; not every production is indexed.
- Version 0.1 browsing and Smallville playback were confirmed by the operator on Windows and onn Google TV. Version 0.2 genre filtering still needs testing on those clients.
- Older titles acquire genres in batches of up to 20 when their collection is opened. With large older lists, revisit the collection to complete the lookup. Titles with missing provider genres remain visible without a genre filter.
- This release has local functional and access-control tests; it has not received an independent security audit.

## Share the public setup link

After testing, publish only the public **base `/manifest.json`** URL. Its Configure button sends people to account setup. Do not publish an `/addon/…/manifest.json` personal link.

Independent project by DolphinDiver. Not affiliated with Stremio or any movie studio. See [LICENSE](LICENSE).
