# Update to version 0.2.1

## Upload and deploy

1. Extract this ZIP into a new folder.
2. In the existing dolphindiver-collections GitHub repository, choose Add file → Upload files.
3. Upload the contents of the extracted folder, including the public and test folders. Do not upload the outer folder itself.
4. Commit the update. Render should deploy the new commit automatically.
5. Keep the existing DATABASE_URL and APP_SECRET unchanged. Do not create a new database or service.
6. Check /health shows version 0.2.1 and database connected.
7. Reload your Collections management webpage.
8. Reinstall the same personal manifest link if Stremio does not show the new genre dropdown. Do not replace the installation link.

Existing accounts, saved titles, collection IDs and installation links are preserved. The schema upgrade adds a genre column without deleting records. If deployment fails, read the Render logs rather than resetting the database.

## Mark and Velma's seven collections

First use Account → Download collections backup.

1. Rename My Shows to Mark’s Shows.
2. Keep Watching Together.
3. Open automatic TV Shows, choose Make this a regular collection and confirm. Rename it Saved TV Shows — Mark. Its current titles are retained.
4. Open automatic Movies, make it a regular collection and rename it Saved Movies — Mark.
5. Create Velma’s Shows (TV Shows only).
6. Create Saved TV Shows — Velma (TV Shows only).
7. Create Saved Movies — Velma (Movies only).
8. If either Watch Later list contains titles, use Also save to… to put them in the desired saved collection first. Then delete both Watch Later collections.
9. Use the up/down arrows to arrange:
   - Mark’s Shows
   - Velma’s Shows
   - Watching Together
   - Saved TV Shows — Mark
   - Saved TV Shows — Velma
   - Saved Movies — Mark
   - Saved Movies — Velma
10. Reinstall the same personal link to refresh the Stremio collection names and order if needed.

These are regular collections: adding a title to Mark’s Shows does not automatically put it in Saved TV Shows — Mark. Use Also save to… to include it in both. People sharing the same Collections account can manage every list; the names are organizational labels, not separate permissions. Other users' accounts and starter names are unchanged.

## Genres

In Stremio choose Discover → WatchNest → Watching Together → a genre such as Comedy, Drama or Horror. The genre only filters titles already saved in that collection. A title may have several genres. Use the default unfiltered option to show all saved titles. Menu wording varies by Stremio client.

New saves include genres from Cinemeta. Existing saves fetch genres automatically in batches of up to 20 per collection request. Large old collections may need several visits; provider failures can be retried by reopening the collection. Titles without available genres still appear in the unfiltered catalog.

## WatchNest name

The add-on is now WatchNest by DolphinDiver, and its Discover type is WatchNest. Your existing website URL, database, accounts, personal links, collection IDs and donation link stay the same. Old Collections catalog URLs remain supported for cached installations. Reinstall the same personal manifest link to refresh the displayed name and type. Do not create a second service or regenerate secrets.
