'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const n=require('./navigation');
const a='11111111-1111-4111-8111-111111111111';
test('stable catalog does not change with collection renames',()=>{const m=n.manifestCatalog();assert.equal(m.id,'dd_navigation');assert.equal(m.type,'series');});
test('collection tiles dynamically use current name without changing IDs',()=>{const before=n.tiles([{id:a,name:'WatchNest Test'}]);const after=n.tiles([{id:a,name:'WatchNest Test 2'}]);assert.equal(before[0].id,after[0].id);assert.equal(after[0].name,'WatchNest Test 2');});
test('collection IDs are parsed strictly',()=>{assert.equal(n.parseCollectionId(n.collectionId(a)),a);assert.equal(n.parseCollectionId('dd_collection_../secret'),null);});
test('detail supplies web navigation link',()=>{const d=n.detail({id:a,name:'Movies'},'https://example.com/configure');assert.equal(d.links[0].url,'https://example.com/configure');});
