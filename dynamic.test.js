'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const d=require('./dynamic');
test('stable catalog does not embed collection names',()=>{assert.equal(d.catalog().id,'dd_all_saved');assert.equal(JSON.stringify(d.catalog()).includes('WatchNest Test 2'),false);});
test('collection search parses renamed collections',()=>{assert.deepEqual(d.parseSearch('collection:WatchNest Test 2'),{collection:'WatchNest Test 2',search:''});});
test('ordinary search remains title search',()=>{assert.deepEqual(d.parseSearch('Young Frankenstein'),{collection:null,search:'Young Frankenstein'});});
