'use strict';
const {fail}=require('./security');
const cache=new Map();let active=0;
function safePoster(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:'';}catch{return '';}}
async function get(url){
 const old=cache.get(url);if(old&&old.expiry>Date.now())return old.value;
 if(active>=8)fail(503,'Title search is busy. Please try again.');active++;
 try{
  const response=await fetch(url,{signal:AbortSignal.timeout(10000),redirect:'error'});
  if(!response.ok)fail(502,'The title provider is unavailable. Please try again later.');
  const reader=response.body.getReader();let bytes=0,chunks=[];
  while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.length;if(bytes>2*1024*1024){await reader.cancel();fail(502,'The title provider returned too much data.');}chunks.push(value);}
  const value=JSON.parse(Buffer.concat(chunks).toString());if(cache.size>=250)cache.delete(cache.keys().next().value);cache.set(url,{value,expiry:Date.now()+300000});return value;
 }catch(e){if(e.status)throw e;fail(502,'The title provider did not respond. Please try again later.');}finally{active--;}
}
function sanitize(m,type){if(!/^tt\d{5,12}$/.test(m?.imdb_id||m?.id||'')||!m?.name)return null;return {id:m.imdb_id||m.id,type,name:String(m.name).slice(0,250),year:String(m.releaseInfo||m.year||'').slice(0,30),poster:safePoster(m.poster),genres:[...new Set((Array.isArray(m.genres)?m.genres:[]).filter(x=>typeof x==='string'&&x.trim()).map(x=>x.trim().slice(0,60)))].slice(0,30)};}
const metadata={
 async search(q,type){const data=await get('https://v3-cinemeta.strem.io/catalog/'+type+'/top/search='+encodeURIComponent(q)+'.json');return (data.metas||[]).map(x=>sanitize(x,type)).filter(Boolean).slice(0,24);},
 async lookup(id,type){const data=await get('https://v3-cinemeta.strem.io/meta/'+type+'/'+id+'.json');const result=sanitize(data.meta,type);if(!result||result.id!==id)fail(404,'No matching title was found.');return result;}
};
module.exports={metadata};
