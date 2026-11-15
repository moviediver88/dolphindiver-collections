'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const slots=require('../slots');
test('manifest catalogs stable and unique',()=>{
 const c=slots.catalogs();
 assert.equal(c.length,slots.COUNT*slots.TYPES.length);
 assert.equal(new Set(c.map(x=>x.type+'/'+x.id)).size,c.length);
 assert.deepEqual(c,slots.catalogs());
});
test('valid slot routes',()=>{
 assert.deepEqual(slots.parse('catalog/movie/dd_slot_1.json'),{type:'movie',index:0,extra:''});
 assert.deepEqual(slots.parse(`catalog/series/dd_slot_${slots.COUNT}/search=foo.json`),{type:'series',index:slots.COUNT-1,extra:'search=foo'});
});
test('invalid slot routes',()=>{
 for(const s of ['catalog/movie/dd_slot_0.json',`catalog/movie/dd_slot_${slots.COUNT+1}.json`,'catalog/series/dd_slot_1/../../x.json'])assert.equal(slots.parse(s),null);
});
