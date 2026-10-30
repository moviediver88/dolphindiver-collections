# Deployment walkthrough

This project needs both a web service and a persistent PostgreSQL database. Set up the database before deploying the server. Never paste a database connection string, APP_SECRET, password, recovery code, or personal installation link into GitHub or a public post.

## 1. Upload the project files

1. Extract DolphinDiver_Collections_v0.1.zip.
2. Open https://github.com/moviediver88/dolphindiver-collections.
3. Choose Add file → Upload files.
4. Upload the files plus the **public** and **test** folders into the repository root. In Windows File Explorer, select all extracted contents and drag them into GitHub's upload area. Do not upload the ZIP or an extra enclosing folder.
5. Commit directly to main. README.md replaces the starter README.

The root must contain server.js, store.js, security.js, metadata.js, schema.sql, package.json, package-lock.json, render.yaml, the documentation, plus public/index.html, public/app.js, public/style.css and test files. The server must not be inside an extra folder.

## 2. Create a Neon PostgreSQL database

1. Open https://console.neon.tech and create or sign in to your own account.
2. Create a project for **dolphindiver-collections**. Choose PostgreSQL and a region near your Render service if available.
3. Choose an appropriate plan. A free tier may be available; review the current displayed limits and pricing.
4. Open **Connect** and choose the project's application connection string. A pooled connection is suitable for this application.
5. Copy the entire PostgreSQL URL into a password manager or directly into Render's DATABASE_URL field. Keep TLS enabled in the provider's connection settings.

You do not need to give this secret to ChatGPT or put it into a file. The server creates its own tables at first startup. Use a dedicated database/project rather than a database containing unrelated applications.

Render's free Postgres databases expire after 30 days, so they are not the recommended persistent store for this app. Hosting plans and policies can change; verify them in your dashboards.

## 3. Create the Render web service

1. Open https://dashboard.render.com.
2. Choose **New → Web Service**.
3. Connect **moviediver88/dolphindiver-collections**. Grant Render repository access if needed.
4. Set runtime to **Node**, branch to **main**, and leave Root Directory blank.
5. Name it **dolphindiver-collections**, or use an available service name.
6. Set **Build Command** to `npm ci --omit=dev`.
7. Set **Start Command** to `npm start`.
8. Choose the desired plan. Free web services can sleep when idle and have resource/usage limits; monitor these for a public service.
9. Set Health Check Path to `/health` if available.
10. Add the environment variables below.

| Key | Value |
| --- | --- |
| DATABASE_URL | The complete private Neon PostgreSQL connection string |
| APP_SECRET | Use Render's Generate button to create a random secret of at least 32 characters |
| NODE_VERSION | 22 |
| NODE_ENV | production |
| TRUST_PROXY | 1 |
| REGISTRATION_OPEN | true |
| MAX_ACCOUNTS | 200 |

Render normally supplies RENDER_EXTERNAL_URL automatically. The server uses it for secure cookies and personal install links. If it is unavailable, or you use a custom domain, also set **PUBLIC_URL** to the exact HTTPS address users open, without a trailing path. A mismatch will cause requests to be rejected.

Only set TRUST_PROXY=1 behind the trusted Render reverse proxy. For local direct development, omit it or set it to 0.

**Keep APP_SECRET unchanged across deployments.** It encrypts stored installation keys. Losing or changing it prevents the management page from recovering those keys; retain it securely with your database credentials. Database backups alone are not enough to recover the encryption key.

Click **Deploy web service** and wait for Live. No real user credentials should be needed in build logs.

### Blueprint option

render.yaml defines the same web-service settings. If using New → Blueprint, supply DATABASE_URL when asked. Render generates APP_SECRET. Check the actual service plan and address before completing setup.

## 4. Test your own account before inviting others

1. Open the actual Render URL plus `/health` and confirm status ok, version 0.1.0, database connected.
2. Open the base URL and create your own Collections account with a separate password.
3. Save the recovery code privately. No email reset is available.
4. Search for a movie and a series and add each to a collection.
5. Confirm the automatic Movies and TV Shows collections also contain those items.
6. Make a custom collection and use Also save to… to add an existing title to it.
7. Sign out and sign back in. Confirm your titles remain.
8. Create a second test account in a private browser window. It should have empty starter lists and no access to the first account's titles.
9. Choose Install in Stremio and copy the personal manifest link into Stremio or Addon Manager.
10. Check Discover → Collections on Windows and your onn Google TV device. Check a series' episode list and playback using your normal add-ons.
11. Add another title on the webpage, then switch collections in Stremio to refresh. Check menu changes after reinstalling the same personal link.
12. Redeploy the service and confirm your lists remain. Account data belongs in Neon, not the Render filesystem.

We have local PostgreSQL-compatible integration tests; these steps verify the actual hosting connection and client behavior.

## 5. Sharing and donations

After the device checks, share the **public base website** so each person creates their own account. For Stremio's directory, use the public root manifest:

`https://YOUR-ACTUAL-RENDER-HOST/manifest.json`

That public manifest requires configuration and exposes no user collections. Never submit a personal URL containing `/addon/`.

The setup page and add-on description include https://ko-fi.com/dolphindiver for optional support. No further payment integration is needed in this application.

## 6. Maintain the service

- Run npm test before uploading code changes.
- Commit changed source files and allow Render to redeploy from main.
- Monitor Render and Neon service status, storage, usage and plan limits.
- Back up the PostgreSQL database using your provider's supported backup/export process. Keep APP_SECRET separately and securely.
- Users can export their own lists as JSON. Automatic JSON restore is not implemented in this beta; test database restore separately before relying on backups.
- To pause new signups, set REGISTRATION_OPEN=false and redeploy. Existing accounts continue working.
- MAX_ACCOUNTS is an operator-configurable registration ceiling, not a guarantee of hosting capacity.

### Troubleshooting

- **Startup fails:** confirm DATABASE_URL and APP_SECRET are set and Node 22+ is selected. Check provider connectivity. Do not publish raw connection strings when asking for help.
- **Requests rejected:** PUBLIC_URL must match the address shown in the browser, including https. Use the canonical service address consistently.
- **Stale Stremio menus:** reinstall with the same personal manifest link. Ordinary title additions usually need only a category switch or restart.
- **Old link stopped working:** the account may have replaced its installation key; use Install in Stremio to get the replacement.
- **Title search unavailable:** try later; Cinemeta is an external service. Existing saved lists remain in your own database.
