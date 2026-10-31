# WatchNest v0.3.0 — My Watchlist generic setup

## Update your existing service

Keep your current GitHub repository, Render service, Neon database, DATABASE_URL and APP_SECRET. No new hosting setup is needed.

Before updating, use Account → Download collections backup on your management webpage.

### GitHub upload — keep folders in the right place

1. Extract this ZIP into a new folder.
2. Open the root of moviediver88/dolphindiver-collections on GitHub.
3. Choose Add file → Upload files. Upload only the loose files from the extracted folder, not files from inside public or test. Commit as Update WatchNest to v0.3.0.
4. Open the public folder on GitHub. Choose Add file → Upload files. Open public in your extracted download and upload app.js, index.html and style.css. Commit.
5. Open the test folder on GitHub. Upload app.test.js, fixture.js and generic.test.js from the downloaded test folder. Commit.
6. Wait for the latest Render deployment to finish. Open /health; expect version 0.3.0 and database connected.
7. Refresh the management webpage. Keep using your current account for Mark and Velma.

Existing data and personal installation links are preserved. Existing accounts retain WatchNest as the Discover type and their current lists. Do not delete or recreate the database or regenerate APP_SECRET.

## Test the generic setup

1. Open the public website in a private/incognito window.
2. Create a separate test account and save its recovery code privately.
3. Confirm TV Shows, Movies, Specials and Music appear, with no titles in them.
4. Search in one list and add a title. Specials and Music have a Movies/TV Shows selector: select how the title is indexed. They do not offer a separate music database.
5. Confirm the title appears only in that list. Use Also save to… to put a title in another list.
6. Install this test account's personal link into a separate Stremio account, or test on your own knowing it will add a second WatchNest installation. Keep the Mark/Velma installation.
7. Open Discover → My Watchlist → a catalog → a genre. Check browsing and playback on Windows and onn Google TV.

## Share with friends and family

Share https://dolphindiver-collections.onrender.com — not your private installation link. Each person creates a separate WatchNest account, saves their recovery code, adds titles and installs their personal link into their own Stremio account. People who deliberately share one WatchNest account can edit the same lists.

Optional donations use the existing Support the project button linking to https://ko-fi.com/dolphindiver. The add-on remains free; donations do not buy streams or access. Public directory submissions must use only the base /manifest.json URL, never a personal /addon/… URL.

## Limits and validation

Manual starter catalogs are new-account defaults only. Existing accounts are not reset. Each collection supports the genre dropdown. Music covers indexed video titles, not songs/albums. Metadata or streams may be unavailable for individual titles.

Local tests cover new defaults, no automatic cross-list additions, manual copying, genre filtering, encoded My Watchlist URLs, account isolation and an old-schema upgrade preserving household data and links. The v0.3 interface and playback still need testing on your actual Stremio clients before wider sharing.
