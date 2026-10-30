'use strict';
const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {Store}=require('./store');
const {digest,token,equal,fail,username,password,hashPassword,checkPassword,secretBox}=require('./security');
const {metadata:defaultMetadata}=require('./metadata');
const VERSION='0.2.1',COOKIE='dd_session';
const GENRES=['Action','Adventure','Animation','Biography','Comedy','Crime','Documentary','Drama','Family','Fantasy','Film-Noir','History','Horror','Music','Musical','Mystery','News','Reality-TV','Romance','Sci-Fi','Short','Sport','Talk-Show','Thriller','War','Western'];
const uuid=x=>typeof x==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(x);
function name(x){if(typeof x!=='string'||!x.trim()||x.trim().length>60)fail(400,'Use a collection name between 1 and 60 characters.');return x.trim();}
function itemKey(x){if(typeof x!=='string'||!/^(movie|series):tt\d{5,12}$/.test(x))fail(400,'Invalid title.');return x;}
async function body(req){
 if(!(req.headers['content-type']||'').startsWith('application/json'))fail(415,'Send JSON data.');
 let size=0,chunks=[];for await(const data of req){size+=data.length;if(size>32768)fail(413,'Request is too large.');chunks.push(data);}
 try{const b=JSON.parse(Buffer.concat(chunks).toString()||'{}');if(!b||Array.isArray(b)||typeof b!=='object')throw 0;return b;}catch{fail(400,'Invalid JSON data.');}
}
function createApp({db,secret,publicUrl,metadata=defaultMetadata,registrationOpen=true,maxAccounts=200,trustProxy=false}){
 if(!secret||secret.length<32||secret.startsWith('REPLACE_'))throw Error('APP_SECRET must be a random secret of at least 32 characters.');
 if(!Number.isInteger(maxAccounts)||maxAccounts<1||maxAccounts>100000)throw Error('MAX_ACCOUNTS must be an integer between 1 and 100000.');
 const origin=new URL(publicUrl).origin;
 const secure=origin.startsWith('https:');
 if(!secure&&!['localhost','127.0.0.1','[::1]'].includes(new URL(origin).hostname))throw Error('PUBLIC_URL must use HTTPS.');
 const store=new Store(db),box=secretBox(secret);
 const dummy=hashPassword(crypto.randomBytes(32).toString('hex'));
 const limited=async(req,bucket,max,seconds)=>{
  const forwarded=String(req.headers['x-forwarded-for']||'').split(',').pop().trim();
  const ip=trustProxy&&forwarded?forwarded:req.socket.remoteAddress;
  const key=crypto.createHmac('sha256',secret).update(bucket+'|'+ip).digest('hex');await store.limit(key,max,seconds);
 };
 const headers=(res,cors=false)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Frame-Options','DENY');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' https:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('Permissions-Policy','camera=(), microphone=(), geolocation=()');
  if(secure)res.setHeader('Strict-Transport-Security','max-age=31536000');if(cors)res.setHeader('Access-Control-Allow-Origin','*');
 };
 const json=(res,status,out,cors=false)=>{headers(res,cors);res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(out));};
 const cookie=(res,value,maxAge=604800)=>res.setHeader('Set-Cookie',`${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure?'; Secure':''}`);
 const startSession=async(res,user)=>{const value=token();await store.addSession(digest(value),user.id);cookie(res,value);};
 const getUser=async req=>{const m=String(req.headers.cookie||'').match(/(?:^|;\s*)dd_session=([A-Za-z0-9_-]{43})(?:;|$)/);const u=m&&await store.session(digest(m[1]));if(!u)fail(401,'Please sign in.');return u;};
 function manifest(user,collections=[]){return {
  id:user?'community.dolphindiver.collections.'+user.id:'community.dolphindiver.collections',version:VERSION,
  name:'WatchNest by DolphinDiver',description:'Your personal movie and TV collections. Manage titles on the configuration page. Separate from Stremio Library; no streams hosted. Optional support: https://ko-fi.com/dolphindiver',
  resources:['catalog'],types:['WatchNest','movie','series'],
  catalogs:collections.map(c=>({id:'dd_'+c.id,type:'WatchNest',name:c.name,extra:[{name:'genre',isRequired:false,options:GENRES},{name:'search',isRequired:false},{name:'skip',isRequired:false}]})),
  behaviorHints:{configurable:true,configurationRequired:!user}
 };}
 const server=http.createServer(async(req,res)=>{
  let isFeed=false;
  try{
   const url=new URL(req.url,'http://localhost'),route=url.pathname;
   isFeed=route.startsWith('/addon/')||route==='/manifest.json';
   if(req.method==='OPTIONS'&&isFeed){headers(res,true);res.setHeader('Access-Control-Allow-Methods','GET, HEAD, OPTIONS');res.writeHead(204);return res.end();}
   if(route==='/health'&&['GET','HEAD'].includes(req.method)){await db.query('SELECT 1');return json(res,200,{status:'ok',version:VERSION,database:'connected'});}
   if(route==='/manifest.json'&&['GET','HEAD'].includes(req.method))return json(res,200,manifest(),true);
   if(route.startsWith('/addon/')){
    if(!['GET','HEAD'].includes(req.method))fail(405,'Method not allowed.');
    const m=route.match(/^\/addon\/([A-Za-z0-9_-]{43})\/(.+)$/);if(!m)fail(404,'Add-on link not found.');
    await limited(req,'feed',300,60);
    const user=await store.feed(digest(m[1]));if(!user)fail(404,'This installation link is invalid or has been replaced.');
    if(m[2]==='configure'){headers(res);res.writeHead(302,{Location:'/configure'});return res.end();}
    if(m[2]==='manifest.json'){const cols=(await store.state(user.id)).collections;return json(res,200,manifest(user,cols),true);}
    const c=m[2].match(/^catalog\/(?:WatchNest|Collections)\/dd_([a-f0-9-]{36})(?:\/([^/]*))?\.json$/);
    if(!c||!uuid(c[1]))fail(404,'Catalog not found.');
    const extras=new URLSearchParams(c[2]||'');for(const [k,v] of url.searchParams)extras.set(k,v);
    const search=String(extras.get('search')||'').slice(0,100),raw=String(extras.get('skip')||'0');const skip=/^\d+$/.test(raw)?Math.min(Number(raw),100000):0;
    const genre=String(extras.get('genre')||'').slice(0,60);
    // Upgrade older saved titles in small batches; provider errors never erase titles.
    const pending=await store.pendingGenres(user.id,c[1]);
    for(let i=0;i<pending.length;i+=4)await Promise.all(pending.slice(i,i+4).map(async item=>{try{const m=await metadata.lookup(item.id,item.type);await store.saveGenres(user.id,item.key,m.genres||[]);}catch{}}));
    const metas=await store.catalog(user.id,c[1],search,skip,genre);if(!metas)fail(404,'Collection not found.');return json(res,200,{metas},true);
   }
   if(route.startsWith('/api/')){
    if(!['GET','POST','PATCH','DELETE'].includes(req.method))fail(405,'Method not allowed.');
    if(req.method!=='GET'&&req.headers.origin!==origin)fail(403,'This request must come from the collections website.');
    await limited(req,'api',240,60);
    if(route==='/api/signup'&&req.method==='POST'){
     if(!registrationOpen)fail(403,'New account registration is currently closed.');
     await limited(req,'signup',3,3600);const b=await body(req),n=username(b.username),p=password(b.password);
     const recovery=token(),feed=token(),user={id:crypto.randomUUID(),username:n,password_hash:await hashPassword(p),recovery_hash:digest(recovery),feed_hash:digest(feed),feed_cipher:box.encrypt(feed)};
     try{await store.createUser(user,maxAccounts);}catch(e){if(e.code==='23505')fail(409,'That username is unavailable.');throw e;}
     await startSession(res,user);return json(res,201,{username:n,recoveryCode:recovery});
    }
    if(route==='/api/login'&&req.method==='POST'){
     await limited(req,'login',20,900);const b=await body(req),n=username(b.username);
     await store.limit(digest('login-account|'+n),30,900);
     const u=await store.byUsername(n);const valid=await checkPassword(b.password,u?.password_hash||await dummy);if(!u||!valid)fail(401,'Username or password is incorrect.');await startSession(res,u);return json(res,200,{ok:true});
    }
    if(route==='/api/recover'&&req.method==='POST'){
     await limited(req,'recover',6,3600);const b=await body(req),n=username(b.username);password(b.password);
     const u=await store.byUsername(n);if(!u||typeof b.recoveryCode!=='string'||!equal(digest(b.recoveryCode),u.recovery_hash))fail(401,'Username or recovery code is incorrect.');
     const recovery=token(),hash=await hashPassword(b.password);
     await store.tx(async c=>{
      const locked=(await c.query('SELECT recovery_hash FROM dd_users WHERE id=$1 FOR UPDATE',[u.id])).rows[0];if(!locked||!equal(locked.recovery_hash,digest(b.recoveryCode)))fail(401,'Recovery code has already been used.');
      await c.query('UPDATE dd_users SET password_hash=$1,recovery_hash=$2 WHERE id=$3',[hash,digest(recovery),u.id]);await c.query('DELETE FROM dd_sessions WHERE user_id=$1',[u.id]);
     });cookie(res,'',0);return json(res,200,{ok:true,recoveryCode:recovery});
    }
    const u=await getUser(req);
    if(route==='/api/logout'&&req.method==='POST'){await body(req);const value=String(req.headers.cookie).match(/dd_session=([A-Za-z0-9_-]{43})/)[1];await db.query('DELETE FROM dd_sessions WHERE token_hash=$1',[digest(value)]);cookie(res,'',0);return json(res,200,{ok:true});}
    if(route==='/api/me'&&req.method==='GET')return json(res,200,{username:u.username,...await store.state(u.id)});
    if(route==='/api/search'&&req.method==='GET'){
     await limited(req,'search',40,60);const q=String(url.searchParams.get('q')||'').trim(),type=url.searchParams.get('type');
     if(q.length<2||q.length>100||!['movie','series'].includes(type))fail(400,'Enter a title of 2–100 characters and select Movies or TV Shows.');
     return json(res,200,{items:await metadata.search(q,type)});
    }
    if(route==='/api/install'&&req.method==='POST'){await body(req);return json(res,200,{url:origin+'/addon/'+box.decrypt(u.feed_cipher)+'/manifest.json'});}
    if(route==='/api/collections'&&req.method==='POST'){const b=await body(req);if(!['all','movie','series'].includes(b.kind))fail(400,'Choose a valid collection type.');return json(res,201,{id:await store.createCollection(u.id,name(b.name),b.kind)});}
    if(route==='/api/order'&&req.method==='POST'){const b=await body(req);if(!Array.isArray(b.ids)||!b.ids.every(uuid))fail(400,'Invalid collection order.');await store.reorder(u.id,b.ids);return json(res,200,{ok:true});}
    if(route==='/api/make-manual'&&req.method==='POST'){const b=await body(req);if(!uuid(b.collectionId))fail(400,'Invalid collection.');await store.makeManual(u.id,b.collectionId);return json(res,200,{ok:true});}
    const col=route.match(/^\/api\/collections\/([a-f0-9-]{36})$/);
    if(col&&uuid(col[1])&&req.method==='PATCH'){const b=await body(req);await store.renameCollection(u.id,col[1],name(b.name));return json(res,200,{ok:true});}
    if(col&&uuid(col[1])&&req.method==='DELETE'){await body(req);await store.deleteCollection(u.id,col[1]);return json(res,200,{ok:true});}
    if(route==='/api/items'&&req.method==='POST'){
     await limited(req,'add-title',60,60);const b=await body(req);
     if(!uuid(b.collectionId)||!['movie','series'].includes(b.type)||!/^tt\d{5,12}$/.test(b.id||''))fail(400,'Choose a valid title and collection.');
     // Resolve only a fixed trusted metadata host; client-supplied names and artwork are never stored.
     await store.addItem(u.id,b.collectionId,await metadata.lookup(b.id,b.type));return json(res,201,{ok:true});
    }
    if(route==='/api/membership'&&req.method==='POST'){const b=await body(req);if(!uuid(b.collectionId))fail(400,'Invalid collection.');await store.assign(u.id,b.collectionId,itemKey(b.key));return json(res,200,{ok:true});}
    if(route==='/api/membership'&&req.method==='DELETE'){const b=await body(req);if(!uuid(b.collectionId))fail(400,'Invalid collection.');await store.removeMembership(u.id,b.collectionId,itemKey(b.key));return json(res,200,{ok:true});}
    if(route==='/api/items'&&req.method==='DELETE'){const b=await body(req);await store.removeItem(u.id,itemKey(b.key));return json(res,200,{ok:true});}
    if(route==='/api/export'&&req.method==='GET'){res.setHeader('Content-Disposition','attachment; filename="dolphindiver-collections-backup.json"');return json(res,200,{format:'dolphindiver-collections',version:1,exportedAt:new Date().toISOString(),...await store.state(u.id)});}
    if(['/api/rotate-link','/api/password','/api/recovery-code','/api/account'].includes(route)&&req.method==='POST'){
     await limited(req,'sensitive',10,900);const b=await body(req);if(!await checkPassword(b.password,u.password_hash))fail(401,'Password is incorrect.');
     if(route==='/api/rotate-link'){const feed=token();await db.query('UPDATE dd_users SET feed_hash=$1,feed_cipher=$2 WHERE id=$3',[digest(feed),box.encrypt(feed),u.id]);return json(res,200,{ok:true});}
     if(route==='/api/password'){password(b.newPassword);const hash=await hashPassword(b.newPassword);await store.tx(async c=>{await c.query('UPDATE dd_users SET password_hash=$1 WHERE id=$2',[hash,u.id]);await c.query('DELETE FROM dd_sessions WHERE user_id=$1',[u.id]);});cookie(res,'',0);return json(res,200,{ok:true});}
     if(route==='/api/recovery-code'){const recovery=token();await db.query('UPDATE dd_users SET recovery_hash=$1 WHERE id=$2',[digest(recovery),u.id]);return json(res,200,{recoveryCode:recovery});}
     if(route==='/api/account'){if(b.confirm!=='DELETE')fail(400,'Type DELETE to confirm.');await db.query('DELETE FROM dd_users WHERE id=$1',[u.id]);cookie(res,'',0);return json(res,200,{ok:true});}
    }
    fail(404,'API endpoint not found.');
   }
   const assets={'/':'index.html','/configure':'index.html','/app.js':'app.js','/style.css':'style.css'};
   if(assets[route]&&['GET','HEAD'].includes(req.method)){
    headers(res);const file=assets[route];res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript; charset=utf-8':file.endsWith('.css')?'text/css; charset=utf-8':'text/html; charset=utf-8'});return res.end(fs.readFileSync(path.join(__dirname,'public',file)));
   }
   fail(404,'Page not found.');
  }catch(e){if(res.headersSent)return res.end();json(res,e.status||503,{error:e.status?e.message:'The service is temporarily unavailable. Please try again.'},isFeed);}
 });
 server.requestTimeout=15000;server.headersTimeout=10000;
 return {server,store,manifest,ready:dummy};
}
async function main(){
 const {Pool}=require('pg');
 const databaseUrl=process.env.DATABASE_URL;if(!databaseUrl)throw Error('Set DATABASE_URL in the hosting environment.');
 const secret=process.env.APP_SECRET;
 const publicUrl=process.env.PUBLIC_URL||process.env.RENDER_EXTERNAL_URL;
 if(!publicUrl)throw Error('Set PUBLIC_URL to your HTTPS website address.');
 const dbUrl=new URL(databaseUrl);const local=['localhost','127.0.0.1','[::1]'].includes(dbUrl.hostname);
 // Enforce certificate verification, including when the provider URL says sslmode=require.
 for(const k of ['sslmode','sslcert','sslkey','sslrootcert'])dbUrl.searchParams.delete(k);
 const db=new Pool({connectionString:dbUrl.toString(),ssl:local?false:{rejectUnauthorized:true},max:5,connectionTimeoutMillis:15000,idleTimeoutMillis:30000,statement_timeout:15000});
 db.on('error',()=>console.error('Database connection interrupted.'));
 const app=createApp({db,secret,publicUrl,registrationOpen:process.env.REGISTRATION_OPEN!=='false',maxAccounts:Number(process.env.MAX_ACCOUNTS||200),trustProxy:process.env.TRUST_PROXY==='1'});
 await app.ready;
 await db.query(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
 await app.store.cleanup();const timer=setInterval(()=>app.store.cleanup().catch(()=>{}),3600000);timer.unref();
 app.server.listen(Number(process.env.PORT||7000),'0.0.0.0',()=>console.log('WatchNest '+VERSION+' ready'));
 const shutdown=()=>app.server.close(()=>db.end().then(()=>process.exit(0)));process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
}
if(require.main===module)main().catch(e=>{console.error(e.code?'Startup failed; database error '+e.code:e.message);process.exit(1);});
module.exports={createApp};
