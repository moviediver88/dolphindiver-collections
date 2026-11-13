
'use strict';

// WatchNest v0.4.0 - Navigation Prototype
// Development test only. Does not affect live WatchNest.

const testCollections = [
  { id: 'movies', name: 'Saved Movies' },
  { id: 'shows', name: 'Saved TV Shows' },
  { id: 'together', name: 'Watching Together' }
];

function buildNavigation(collections) {
  return collections.map(collection => ({
    id: collection.id,
    name: collection.name
  }));
}

module.exports = { buildNavigation };
