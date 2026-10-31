'use strict';
const {randomUUID}=require('node:crypto');
const {fail}=require('./security');
const starters=[['TV Shows','series',false],['Movies','movie',false],['Specials','all',false],['Music','all',false]];
class Store {
 constructor(db){this.db=db;}
 async tx(fn){const c=await this.db.connect();try{await c.query('BEGIN');const out=await fn(c);await c.query('COMMIT');return out;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async limit(key,max,seconds){const r=await this.db.query(`INSERT INTO dd_limits(key,hits,expires_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN dd_limits.expires_at<now() THEN 1 ELSE dd_limits.hits+1 END, expires_at=CASE WHEN dd_limits.expires_at<now() THEN excluded.expires_at ELSE dd_limits.expires_at END RETURNING hits`,[key,seconds]);if(r.rows[0].hits>max)fail(429,'Too many attempts. Please wait and try again.');}
 async cleanup(){await this.db.query('DELETE FROM dd_sessions WHERE expires_at<now()');await this.db.query('DELETE FROM dd_limits WHERE expires_at<now()');}
 async createUser(user,max){return this.tx(async c=>{
  // A row lock serializes signup quotas without relying on session-level advisory locks.
  await c.query(`INSERT INTO dd_limits(key,hits,expires_at) VALUES($1,0,'2099-01-01') ON CONFLICT DO NOTHING`,['0'.repeat(64)]);
  await c.query('SELECT key FROM dd_limits WHERE key=$1 FOR UPDATE',['0'.repeat(64)]);
  const count=await c.query('SELECT count(*)::int AS n FROM dd_users');if(count.rows[0].n>=max)fail(503,'Registration is full. Please contact the service operator.');
  await c.query('INSERT INTO dd_users(id,username,password_hash,recovery_hash,feed_hash,feed_cipher,catalog_type) VALUES($1,$2,$3,$4,$5,$6,$7)',[user.id,user.username,user.password_hash,user.recovery_hash,user.feed_hash,user.feed_cipher,'My Watchlist']);
  for(let i=0;i<starters.length;i++){const [name,kind,smart]=starters[i];await c.query('INSERT INTO dd_collections(id,user_id,name,kind,smart,position) VALUES($1,$2,$3,$4,$5,$6)',[randomUUID(),user.id,name,kind,smart,i]);}
 });}
 async byUsername(n){return (await this.db.query('SELECT * FROM dd_users WHERE username=$1',[n])).rows[0];}
 async session(hash){return (await this.db.query('SELECT u.* FROM dd_users u JOIN dd_sessions s ON s.user_id=u.id WHERE s.token_hash=$1 AND s.expires_at>now()',[hash])).rows[0];}
 async feed(hash){return (await this.db.query('SELECT id,catalog_type FROM dd_users WHERE feed_hash=$1',[hash])).rows[0];}
 async addSession(hash,id){await this.db.query("INSERT INTO dd_sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash,id]);}
 async state(uid){
  const collections=(await this.db.query('SELECT id,name,kind,smart,position FROM dd_collections WHERE user_id=$1 ORDER BY position,id',[uid])).rows;
  const items=(await this.db.query('SELECT item_key AS key,imdb_id AS id,type,name,year,poster,genres FROM dd_items WHERE user_id=$1 ORDER BY added_at DESC,item_key',[uid])).rows;
  const memberships=(await this.db.query('SELECT collection_id,item_key FROM dd_memberships WHERE user_id=$1',[uid])).rows;
  return {collections,items,memberships};
 }
 async createCollection(uid,name,kind){return this.tx(async c=>{
  await c.query('SELECT id FROM dd_users WHERE id=$1 FOR UPDATE',[uid]);
  const r=await c.query('SELECT count(*)::int AS n,coalesce(max(position),0)::int AS p FROM dd_collections WHERE user_id=$1',[uid]);if(r.rows[0].n>=50)fail(400,'You can create up to 50 collections.');
  const id=randomUUID();await c.query('INSERT INTO dd_collections(id,user_id,name,kind,position) VALUES($1,$2,$3,$4,$5)',[id,uid,name,kind,r.rows[0].p+1]);return id;
 });}
 async makeManual(uid,id){return this.tx(async c=>{
  await c.query('SELECT id FROM dd_users WHERE id=$1 FOR UPDATE',[uid]);
  const col=(await c.query('SELECT kind,smart FROM dd_collections WHERE user_id=$1 AND id=$2 FOR UPDATE',[uid,id])).rows[0];if(!col)fail(404,'Collection not found.');
  if(!col.smart)return;
  await c.query('INSERT INTO dd_memberships(user_id,collection_id,item_key) SELECT user_id,$2,item_key FROM dd_items WHERE user_id=$1 AND type=$3 ON CONFLICT DO NOTHING',[uid,id,col.kind]);
  await c.query('UPDATE dd_collections SET smart=false WHERE user_id=$1 AND id=$2',[uid,id]);
 });}
 async renameCollection(uid,id,name){const r=await this.db.query('UPDATE dd_collections SET name=$1 WHERE user_id=$2 AND id=$3 RETURNING id',[name,uid,id]);if(!r.rows.length)fail(404,'Collection not found.');}
 async deleteCollection(uid,id){const r=await this.db.query('DELETE FROM dd_collections WHERE user_id=$1 AND id=$2 AND smart=false RETURNING id',[uid,id]);if(!r.rows.length)fail(404,'Collection not found or is an automatic collection.');}
 async reorder(uid,ids){return this.tx(async c=>{const rows=(await c.query('SELECT id FROM dd_collections WHERE user_id=$1 FOR UPDATE',[uid])).rows.map(x=>x.id);if(ids.length!==rows.length||new Set(ids).size!==rows.length||!ids.every(id=>rows.includes(id)))fail(400,'Collection order is invalid.');for(let i=0;i<ids.length;i++)await c.query('UPDATE dd_collections SET position=$1 WHERE user_id=$2 AND id=$3',[i,uid,ids[i]]);});}
 async addItem(uid,collectionId,m){return this.tx(async c=>{
  await c.query('SELECT id FROM dd_users WHERE id=$1 FOR UPDATE',[uid]);
  const collection=(await c.query('SELECT id,kind,smart FROM dd_collections WHERE user_id=$1 AND id=$2',[uid,collectionId])).rows[0];if(!collection)fail(404,'Collection not found.');
  if(collection.kind!=='all'&&collection.kind!==m.type)fail(400,'This title does not match the collection type.');
  const key=m.type+':'+m.id;
  const exists=(await c.query('SELECT item_key FROM dd_items WHERE user_id=$1 AND item_key=$2',[uid,key])).rows.length;
  if(!exists){const r=await c.query('SELECT count(*)::int AS n FROM dd_items WHERE user_id=$1',[uid]);if(r.rows[0].n>=5000)fail(400,'You can save up to 5,000 titles.');}
  await c.query('INSERT INTO dd_items(user_id,item_key,imdb_id,type,name,year,poster,genres) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(user_id,item_key) DO UPDATE SET name=excluded.name,year=excluded.year,poster=excluded.poster,genres=excluded.genres',[uid,key,m.id,m.type,m.name,m.year,m.poster,m.genres||[]]);
  if(!collection.smart)await c.query('INSERT INTO dd_memberships(user_id,collection_id,item_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[uid,collectionId,key]);
 });}
 async assign(uid,collectionId,key){return this.tx(async c=>{
  const item=(await c.query('SELECT imdb_id AS id,type,name,year,poster,genres FROM dd_items WHERE user_id=$1 AND item_key=$2',[uid,key])).rows[0];if(!item)fail(404,'Title not found.');
  const col=(await c.query('SELECT kind,smart FROM dd_collections WHERE user_id=$1 AND id=$2',[uid,collectionId])).rows[0];if(!col||col.smart)fail(404,'Choose a custom collection.');if(col.kind!=='all'&&col.kind!==item.type)fail(400,'This title does not match the collection type.');
  await c.query('INSERT INTO dd_memberships(user_id,collection_id,item_key) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',[uid,collectionId,key]);
 });}
 async removeMembership(uid,id,key){const c=(await this.db.query('SELECT smart FROM dd_collections WHERE user_id=$1 AND id=$2',[uid,id])).rows[0];if(!c||c.smart)fail(400,'Use Remove from all collections for automatic Movies/TV Shows.');await this.db.query('DELETE FROM dd_memberships WHERE user_id=$1 AND collection_id=$2 AND item_key=$3',[uid,id,key]);}
 async removeItem(uid,key){await this.db.query('DELETE FROM dd_items WHERE user_id=$1 AND item_key=$2',[uid,key]);}
 async pendingGenres(uid,id){
  return (await this.db.query(`SELECT i.item_key AS key,i.imdb_id AS id,i.type FROM dd_items i JOIN dd_collections c ON c.user_id=i.user_id WHERE c.user_id=$1 AND c.id=$2 AND i.genres IS NULL AND ((c.smart AND i.type=c.kind) OR EXISTS(SELECT 1 FROM dd_memberships m WHERE m.user_id=i.user_id AND m.item_key=i.item_key AND m.collection_id=c.id)) LIMIT 20`,[uid,id])).rows;
 }
 async saveGenres(uid,key,genres){await this.db.query('UPDATE dd_items SET genres=$1 WHERE user_id=$2 AND item_key=$3 AND genres IS NULL',[genres,uid,key]);}
 async catalog(uid,id,search,skip,genre='') {
  const c=(await this.db.query('SELECT * FROM dd_collections WHERE user_id=$1 AND id=$2',[uid,id])).rows[0];if(!c)return null;
  // Parameterized ILIKE avoids wildcard interpretation of a user's literal search text.
  const q='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
  let sql=c.smart?'SELECT i.imdb_id AS id,i.type,i.name,i.year AS "releaseInfo",i.poster FROM dd_items i WHERE i.user_id=$1 AND i.type=$2 AND i.name ILIKE $3 AND ($5=\'\' OR $5=ANY(i.genres)) ORDER BY i.added_at DESC,i.item_key LIMIT 100 OFFSET $4':'SELECT i.imdb_id AS id,i.type,i.name,i.year AS "releaseInfo",i.poster FROM dd_items i JOIN dd_memberships m ON m.user_id=i.user_id AND m.item_key=i.item_key WHERE m.user_id=$1 AND m.collection_id=$2 AND i.name ILIKE $3 AND ($5=\'\' OR $5=ANY(i.genres)) ORDER BY m.added_at DESC,i.item_key LIMIT 100 OFFSET $4';
  return (await this.db.query(sql,[uid,c.smart?c.kind:id,q,skip,genre])).rows;
 }
}
module.exports={Store};
