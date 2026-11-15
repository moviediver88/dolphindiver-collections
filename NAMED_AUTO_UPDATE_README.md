# WatchNest 0.5.0 RC3 — named collections plus live fallback

This testing build retains the existing named collection dropdowns and adds permanent All WatchNest Movies and All WatchNest TV Shows catalogs. These permanent catalogs retrieve saved titles from the database on every request; they do not depend on collection names in the installed manifest.

Search in the All WatchNest catalog with `collection:Movies` (replace Movies with the collection name) to filter by a newly created or renamed collection, without reinstalling. The individual named collection dropdowns remain manifest-based and can be stale until Stremio refreshes/reinstalls. That limitation cannot be eliminated by the add-on server alone.

Do not upload this to main until CI and live staging testing with a separate database and account pass. Existing user data should be backed up before release.
