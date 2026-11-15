# WatchNest v0.5.0 experimental native browsing build — DO NOT INSTALL

This builds on the previous navigation prototype and adds a **stable native Stremio catalog** called "All My WatchNest Titles". It returns real movie and series metadata from the account's stored titles. It accepts normal title searches and a `collection:NAME` search filter; that filter is parsed at request time, so a renamed collection can be searched by its new name without a manifest change.

**Not the requested finished solution:** This does not make collection names automatically appear in Stremio's dropdown, nor does clicking a collection tile open a nested native catalog. Stremio clients may also restrict search in catalog types or display mixed media differently. The new catalog is registered as type `movie`, although its returned items may include `series`; this needs real-client validation.

The original v0.4.0 deployment should remain untouched. Do not deploy this package to the existing Render instance or publish it. Unit tests and syntax checks are not substitutes for a Stremio live-client integration test. Database integration tests were not run.
