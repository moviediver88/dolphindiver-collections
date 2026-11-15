'use strict';
// Stable Stremio catalog slots. Collection membership and names are fetched per request.
// Stable manifest means collection rename/add/delete never changes installed catalogs.
const COUNT=12;
const TYPES=['movie','series'];
function catalogs(){return TYPES.flatMap(type=>Array.from({length:COUNT},(_,i)=>({id:`dd_slot_${i+1}`,type,name:`Collection ${String(i+1).padStart(2,'0')} — ${type==='movie'?'Movies':'TV'}`,extra:[{name:'search',isRequired:false},{name:'skip',isRequired:false},{name:'genre',isRequired:false}]})));}
function parse(route){const m=/^catalog\/(movie|series)\/dd_slot_(\d{1,2})(?:\/([^/]*))?\.json$/.exec(route);if(!m)return null;const slot=Number(m[2]);return slot>=1&&slot<=COUNT?{type:m[1],index:slot-1,extra:m[3]||''}:null;}
module.exports={COUNT,TYPES,catalogs,parse};
