'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const {createApp}=require('../server');const {database,metadata}=require('./fixture');
const secret='integration-test-secret-with-at-least-32-characters';
test('multi-user collection flows and access boundaries',{timeout:90000},async t=>{
 const db=await database();let app=createApp({db,secret,publicUrl:'http://localhost:7000',metadata});await app.ready;await new Promise(r=>app.server.listen(0,'127.0.0.1',r));let base='http://127.0.0.1:'+app.server.address().port;
 const close=async()=>new Promise(r=>app.server.close(r));
 async function req(path,method='GET',body,cookie='',origin='http://localhost:7000'){
  const r=await fetch(base+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(method!=='GET'?{Origin:origin,'Content-Type':'application/json'}:{})},body:method==='GET'?undefined:JSON.stringify(body||{})});
  return {status:r.status,headers:r.headers,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
 }
 let alice,bob,aliceState,bobState,aliceLink,bobLink,code;
 try{
  await t.test('registration, starter lists, cookies and private authentication',async()=>{
   alice=await req('/api/signup','POST',{username:'alice',password:'a strong password 123'});assert.equal(alice.status,201);code=alice.data.recoveryCode;assert.equal(code.length,43);assert.match(alice.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
   bob=await req('/api/signup','POST',{username:'bob',password:'another good password 456'});assert.equal(bob.status,201);
   // Model the existing v0.2 household layout so upgrade compatibility stays covered.
   for(const n of ['alice','bob']){
    const u=(await db.query('SELECT id FROM dd_users WHERE username=$1',[n])).rows[0];
    await db.query("UPDATE dd_users SET catalog_type='WatchNest' WHERE id=$1",[u.id]);
    await db.query('DELETE FROM dd_collections WHERE user_id=$1',[u.id]);
    const legacy=[['My Shows','series',false],['Watching Together','all',false],['Watch Later — TV Shows','series',false],['Watch Later — Movies','movie',false],['TV Shows','series',true],['Movies','movie',true]];
    for(let i=0;i<legacy.length;i++)await db.query('INSERT INTO dd_collections(id,user_id,name,kind,smart,position) VALUES($1,$2,$3,$4,$5,$6)',[require('node:crypto').randomUUID(),u.id,...legacy[i],i]);
   }
   const me=await req('/api/me','GET',null,alice.cookie);aliceState=me.data;assert.equal(aliceState.collections.length,6);assert.deepEqual(aliceState.items,[]);assert.ok(!JSON.stringify(me.data).includes('password_hash'));assert.equal(me.headers.get('cache-control'),'no-store');
   bobState=(await req('/api/me','GET',null,bob.cookie)).data;assert.notEqual(aliceState.collections[0].id,bobState.collections[0].id);
   assert.equal((await req('/api/me')).status,401);
   assert.equal((await req('/api/signup','POST',{username:'xy',password:'short'})).status,400);
   assert.equal((await req('/api/signup','POST',{username:'alice',password:'a strong password 123'},'','https://hostile.invalid')).status,403);
  });
  let movieCol,seriesCol;
  await t.test('create, add search result, deduplicate and automatically classify titles',async()=>{
   let c=await req('/api/collections','POST',{name:'Weekend favorites',kind:'all'},alice.cookie);assert.equal(c.status,201);movieCol=c.data.id;
   seriesCol=aliceState.collections.find(x=>!x.smart&&x.kind==='series').id;
   const search=await req('/api/search?q=Iron&type=movie','GET',null,alice.cookie);assert.equal(search.data.items[0].id,'tt0371746');
   assert.equal((await req('/api/items','POST',{collectionId:movieCol,id:'tt0371746',type:'movie',name:'spoofed title'},alice.cookie)).status,201);
   assert.equal((await req('/api/items','POST',{collectionId:movieCol,id:'tt0371746',type:'movie'},alice.cookie)).status,201);
   assert.equal((await req('/api/items','POST',{collectionId:seriesCol,id:'tt0371746',type:'movie'},alice.cookie)).status,400);
   assert.equal((await req('/api/items','POST',{collectionId:seriesCol,id:'tt9140554',type:'series'},alice.cookie)).status,201);
   aliceState=(await req('/api/me','GET',null,alice.cookie)).data;assert.equal(aliceState.items.length,2);assert.equal(aliceState.items.find(x=>x.id==='tt0371746').name,'Iron Man');
   assert.equal((await req('/api/search?q=Iron&type=anything','GET',null,alice.cookie)).status,400);
  });
  await t.test('read-only feeds, distinct IDs, same-origin protection and cross-user isolation',async()=>{
   aliceLink=(await req('/api/install','POST',{},alice.cookie)).data.url;bobLink=(await req('/api/install','POST',{},bob.cookie)).data.url;
   const ap=new URL(aliceLink).pathname,bp=new URL(bobLink).pathname;
   const a=await req(ap),b=await req(bp);assert.equal(a.status,200);assert.notEqual(a.data.id,b.data.id);assert.equal(a.headers.get('access-control-allow-origin'),'*');assert.equal(a.data.behaviorHints.configurationRequired,false);
   const feed=ap.replace('manifest.json','catalog/WatchNest/dd_'+movieCol+'.json');assert.equal((await req(feed)).data.metas[0].name,'Iron Man');
   assert.ok(a.data.catalogs[0].extra.find(x=>x.name==='genre').options.includes('Comedy'));
   assert.equal((await req(feed.replace('.json','/genre=Action.json'))).data.metas.length,1);
   assert.equal((await req(feed.replace('.json','/genre=Comedy.json'))).data.metas.length,0);
   assert.equal((await req(feed.replace('.json','/genre=Sci-Fi&search=Iron&skip=0.json'))).data.metas.length,1);
   // Existing v0.1 rows have no genres: the first feed request fills them without changing memberships.
   await db.query('UPDATE dd_items SET genres=NULL WHERE imdb_id=$1',['tt0371746']);
   assert.equal((await req(feed.replace('.json','/genre=Action.json'))).data.metas.length,1);
   assert.deepEqual((await db.query('SELECT genres FROM dd_items WHERE imdb_id=$1',['tt0371746'])).rows[0].genres,['Action','Sci-Fi']);
   assert.equal(a.data.name,'WatchNest by DolphinDiver');assert.equal(a.data.catalogs[0].type,'WatchNest');
   assert.equal((await req(feed.replace('/WatchNest/','/Collections/'))).status,200);
   const other=bp.replace('manifest.json','catalog/WatchNest/dd_'+movieCol+'.json');assert.equal((await req(other)).status,404);
   assert.equal((await req('/api/collections/'+movieCol,'PATCH',{name:'hijacked'},bob.cookie)).status,404);
   assert.equal((await req('/api/collections/'+movieCol,'DELETE',{},bob.cookie)).status,404);
   assert.equal((await req('/api/items','POST',{collectionId:movieCol,id:'tt0371746',type:'movie'},bob.cookie)).status,404);
   assert.equal((await req('/api/membership','POST',{collectionId:movieCol,key:'movie:tt0371746'},bob.cookie)).status,404);
   assert.equal((await req('/api/collections','POST',{name:'unauthorized',kind:'all'},'',new URL(aliceLink).origin)).status,401);
   const q=await req(feed.replace('.json','/search=Iron&skip=0.json'));assert.equal(q.data.metas.length,1);
   const literal=await req(feed.replace('.json','/search=%25.json'));assert.equal(literal.data.metas.length,0);
   assert.equal((await req(feed.replace('.json','/skip=100.json'))).data.metas.length,0);
  });
  await t.test('membership copying and removal preserve automatic collections',async()=>{
   const target=aliceState.collections.find(x=>x.name==='Watch Later — Movies');
   assert.equal((await req('/api/membership','POST',{collectionId:target.id,key:'movie:tt0371746'},alice.cookie)).status,200);
   assert.equal((await req('/api/membership','DELETE',{collectionId:movieCol,key:'movie:tt0371746'},alice.cookie)).status,200);
   let s=(await req('/api/me','GET',null,alice.cookie)).data;assert.equal(s.items.length,2);assert.ok(s.memberships.some(x=>x.collection_id===target.id));
   const auto=s.collections.find(x=>x.smart&&x.kind==='movie');const url=new URL(aliceLink).pathname.replace('manifest.json','catalog/WatchNest/dd_'+auto.id+'.json');assert.equal((await req(url)).data.metas.length,1);
   assert.equal((await req('/api/collections/'+auto.id,'DELETE',{},alice.cookie)).status,404);
  });
  await t.test('convert automatic collection without losing titles or leaking other accounts',async()=>{
   const auto=aliceState.collections.find(x=>x.smart&&x.kind==='series');
   assert.equal((await req('/api/make-manual','POST',{collectionId:auto.id},bob.cookie)).status,404);
   assert.equal((await req('/api/make-manual','POST',{collectionId:auto.id},alice.cookie)).status,200);
   const current=(await req('/api/me','GET',null,alice.cookie)).data;
   assert.equal(current.collections.find(x=>x.id===auto.id).smart,false);
   assert.ok(current.memberships.some(x=>x.collection_id===auto.id&&x.item_key==='series:tt9140554'));
   assert.equal((await req('/api/make-manual','POST',{collectionId:auto.id},alice.cookie)).status,200);
  });
  await t.test('rename, ordering and export contain no credentials',async()=>{
   assert.equal((await req('/api/collections/'+movieCol,'PATCH',{name:'Weekend movies'},alice.cookie)).status,200);
   const s=(await req('/api/me','GET',null,alice.cookie)).data;const ids=s.collections.map(x=>x.id).reverse();assert.equal((await req('/api/order','POST',{ids},alice.cookie)).status,200);
   assert.equal((await req('/api/order','POST',{ids:[...ids.slice(0,-1),ids[0]]},alice.cookie)).status,400);
   const exported=await req('/api/export','GET',null,alice.cookie);assert.equal(exported.data.format,'dolphindiver-collections');assert.equal(exported.data.items.length,2);assert.ok(!JSON.stringify(exported.data).includes('feed_'));assert.ok(!JSON.stringify(exported.data).includes('password'));
  });
  await t.test('application restart retains collections, sessions and feed links',async()=>{
   await close();app=createApp({db,secret,publicUrl:'http://localhost:7000',metadata});await app.ready;await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base='http://127.0.0.1:'+app.server.address().port;
   assert.equal((await req('/api/me','GET',null,alice.cookie)).data.items.length,2);assert.equal((await req(new URL(aliceLink).pathname)).status,200);
  });
  await t.test('feed rotation invalidates old read links and preserves account data',async()=>{
   assert.equal((await req('/api/rotate-link','POST',{password:'wrong password'},alice.cookie)).status,401);
   assert.equal((await req('/api/rotate-link','POST',{password:'a strong password 123'},alice.cookie)).status,200);
   assert.equal((await req(new URL(aliceLink).pathname)).status,404);aliceLink=(await req('/api/install','POST',{},alice.cookie)).data.url;assert.equal((await req(new URL(aliceLink).pathname)).status,200);
   const stored=(await db.query('SELECT feed_hash,feed_cipher FROM dd_users WHERE username=$1',['alice'])).rows[0];const plain=new URL(aliceLink).pathname.split('/')[2];assert.notEqual(stored.feed_hash,plain);assert.ok(!stored.feed_cipher.includes(plain));
  });
  await t.test('one-use recovery resets password and revokes existing sessions',async()=>{
   const reset=await req('/api/recover','POST',{username:'alice',recoveryCode:code,password:'my replacement password 987'});assert.equal(reset.status,200);assert.notEqual(reset.data.recoveryCode,code);
   assert.equal((await req('/api/me','GET',null,alice.cookie)).status,401);
   assert.equal((await req('/api/recover','POST',{username:'alice',recoveryCode:code,password:'my replacement password 987'})).status,401);
   assert.equal((await req('/api/login','POST',{username:'alice',password:'a strong password 123'})).status,401);
   alice=await req('/api/login','POST',{username:'alice',password:'my replacement password 987'});assert.equal(alice.status,200);
   assert.equal((await req('/api/me','GET',null,alice.cookie)).data.items.length,2);
  });
  await t.test('logout and account deletion remove access and cascade stored titles',async()=>{
   assert.equal((await req('/api/logout','POST',{},bob.cookie)).status,200);assert.equal((await req('/api/me','GET',null,bob.cookie)).status,401);
   assert.equal((await req('/api/account','POST',{password:'my replacement password 987',confirm:'DELETE'},alice.cookie)).status,200);
   assert.equal((await req(new URL(aliceLink).pathname)).status,404);assert.equal((await req('/api/me','GET',null,alice.cookie)).status,401);
   assert.equal((await db.query('SELECT count(*)::int AS n FROM dd_items')).rows[0].n,0);
  });
  await t.test('rate limits persist in database and health omits user statistics',async()=>{
   await app.store.limit('a'.repeat(64),1,900);await assert.rejects(()=>app.store.limit('a'.repeat(64),1,900),e=>e.status===429);
   const h=await req('/health');assert.deepEqual(Object.keys(h.data).sort(),['database','status','version']);
   const root=await req('/manifest.json');assert.equal(root.data.behaviorHints.configurationRequired,true);assert.deepEqual(root.data.catalogs,[]);
  });
 }finally{await close();await db.end();}
});
