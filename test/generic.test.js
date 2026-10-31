'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const {createApp}=require('../server');const {database,metadata}=require('./fixture');
test('generic manual catalogs, encoded type, independent accounts and safe household upgrade',async()=>{
 const db=await database();const app=createApp({db,secret:'generic-test-secret-at-least-32-characters',publicUrl:'http://localhost:7000',metadata});await app.ready;await new Promise(r=>app.server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+app.server.address().port;
 async function req(url,method='GET',body,cookie=''){const r=await fetch(base+url,{method,headers:{Cookie:cookie,...(method==='GET'?{}:{Origin:'http://localhost:7000','Content-Type':'application/json'})},body:method==='GET'?undefined:JSON.stringify(body||{})});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};}
 try{
 const a=await req('/api/signup','POST',{username:'family',password:'a different password 123'});assert.equal(a.status,201);
 const b=await req('/api/signup','POST',{username:'friend',password:'another password 456'});assert.equal(b.status,201);
 const s=(await req('/api/me','GET',null,a.cookie)).data;
 assert.deepEqual(s.collections.map(x=>[x.name,x.kind,x.smart]),[['TV Shows','series',false],['Movies','movie',false],['Specials','all',false],['Music','all',false]]);
 const col=n=>s.collections.find(x=>x.name===n).id;
 assert.equal((await req('/api/items','POST',{collectionId:col('Specials'),id:'tt0371746',type:'movie'},a.cookie)).status,201);
 assert.equal((await req('/api/items','POST',{collectionId:col('Music'),id:'tt9140554',type:'series'},a.cookie)).status,201);
 const link=(await req('/api/install','POST',{},a.cookie)).data.url;const mp=new URL(link).pathname;
 const manifest=(await req(mp)).data;assert.equal(manifest.types[0],'My Watchlist');assert.ok(manifest.catalogs.every(x=>x.type==='My Watchlist'));
 const feed=n=>mp.replace('manifest.json','catalog/My%20Watchlist/dd_'+col(n)+'.json');
 assert.equal((await req(feed('Movies'))).data.metas.length,0);assert.equal((await req(feed('TV Shows'))).data.metas.length,0);
 assert.equal((await req(feed('Specials').replace('.json','/genre=Action.json'))).data.metas.length,1);
 assert.equal((await req(feed('Specials').replace('.json','/genre=Comedy.json'))).data.metas.length,0);
 const otherLink=(await req('/api/install','POST',{},b.cookie)).data.url;
 assert.equal((await req(new URL(otherLink).pathname.replace('manifest.json','catalog/My%20Watchlist/dd_'+col('Specials')+'.json'))).status,404);
 assert.equal((await req('/api/membership','POST',{collectionId:col('Movies'),key:'movie:tt0371746'},a.cookie)).status,200);
 assert.equal((await req(feed('Movies'))).data.metas.length,1);
 // Reproduce an older database with household names and no catalog_type column.
 const uid=(await db.query('SELECT id FROM dd_users WHERE username=$1',['family'])).rows[0].id;
 await db.query('UPDATE dd_collections SET name=$1 WHERE user_id=$2 AND id=$3',["TV Shows - Mark",uid,col('TV Shows')]);
 await db.query('ALTER TABLE dd_users DROP COLUMN catalog_type');
 await db.engine.exec(fs.readFileSync(path.join(__dirname,'..','schema.sql'),'utf8'));
 assert.equal((await req(mp)).data.types[0],'WatchNest');
 const after=(await req('/api/me','GET',null,a.cookie)).data;assert.equal(after.collections[0].name,'TV Shows - Mark');assert.equal(after.items.length,2);assert.equal((await req(feed('Movies'))).data.metas.length,1);
 }finally{await new Promise(r=>app.server.close(r));await db.end();}
});
