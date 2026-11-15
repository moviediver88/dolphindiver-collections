'use strict';
// Stable catalog definitions: no per-collection names in the manifest.
const ID='dd_all_saved';
function catalog(type='movie'){return {id:ID,type,name:type==='movie'?'All WatchNest Movies':'All WatchNest TV Shows',extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false}]};}
function parseSearch(s){const m=/^collection:\s*(.+)$/i.exec(s.trim());return m?{collection:m[1].trim(),search:''}:{collection:null,search:s};}
module.exports={ID,catalog,parseSearch};
