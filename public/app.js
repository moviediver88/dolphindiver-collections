'use strict';
const $=id=>document.getElementById(id);
let state=null,selected=null,authMode='login',assignKey=null,recoveryNext=null;
let noticeTimer;
function notify(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,error?15000:6000);}
async function api(path,method='GET',data){
 const r=await fetch('/api/'+path,{method,credentials:'same-origin',headers:method==='GET'?{}:{'Content-Type':'application/json'},body:method==='GET'?undefined:JSON.stringify(data||{})});
 const result=await r.json();if(!r.ok){if(r.status===401&&state&&!['password','rotate-link','recovery-code','account'].includes(path)){state=null;showAuth();}throw Error(result.error||'The request failed.');}return result;
}
function run(fn){return async event=>{event?.preventDefault();const button=event?.submitter||(event?.currentTarget?.tagName==='BUTTON'?event.currentTarget:null);if(button)button.disabled=true;try{await fn(event);}catch(e){notify(e.message,true);}finally{if(button)button.disabled=false;}};}
function el(tag,text,className){const x=document.createElement(tag);if(text!==undefined)x.textContent=text;if(className)x.className=className;return x;}
function button(text,fn,className='secondary'){const b=el('button',text,className);b.type='button';b.addEventListener('click',run(fn));return b;}
function dialog(id){$(id).showModal();}
function showAuth(){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('auth-screen').hidden=false;$('dashboard').hidden=true;$('recovery-screen').hidden=true;$('password').value='';$('confirm-password').value='';$('recovery-input').value='';$('install-url').value='';}
function setMode(mode){
 authMode=mode;$('tab-login').classList.toggle('active',mode==='login');$('tab-signup').classList.toggle('active',mode==='signup');
 $('auth-heading').textContent=mode==='login'?'Welcome back.':mode==='signup'?'Your lists. Your way.':'Recover your account.';
 $('auth-description').textContent=mode==='signup'?'Choose a separate password of at least 12 characters. No Stremio login is needed.':mode==='recover'?'Use the private recovery code you saved when registering.':'Use your Collections account, not your Stremio password.';
 $('auth-submit').textContent=mode==='login'?'Sign in':mode==='signup'?'Create account':'Reset password';
 $('password').autocomplete=mode==='login'?'current-password':'new-password';$('password').minLength=mode==='login'?1:12;
 $('confirm-wrap').hidden=mode==='login';$('confirm-password').required=mode!=='login';
 $('recovery-wrap').hidden=mode!=='recover';$('recovery-input').required=mode==='recover';
 $('recover-button').textContent=mode==='recover'?'Back to sign in':'Forgot your password?';
}
function showRecovery(code,next){document.querySelectorAll('dialog[open]').forEach(d=>d.close());$('auth-screen').hidden=true;$('dashboard').hidden=true;$('recovery-screen').hidden=false;$('recovery-code').value=code;$('saved-code').checked=false;$('continue-button').disabled=true;recoveryNext=next;}
function collection(){return state?.collections.find(x=>x.id===selected);}
function members(c){return state.items.filter(x=>c.smart?x.type===c.kind:state.memberships.some(m=>m.collection_id===c.id&&m.item_key===x.key));}
function drawNav(){
 $('collection-list').replaceChildren();for(const c of state.collections){const b=button('',()=>{selected=c.id;$('search-section').hidden=true;$('saved-filter').value='';draw();},c.id===selected?'active':'');b.append(el('span',c.name),el('span',String(members(c).length),'collection-count'));b.setAttribute('aria-current',c.id===selected?'page':'false');$('collection-list').append(b);}
}
function card(item,search=false){
 const card=el('article',undefined,'title-card'),poster=el('div',undefined,'poster');poster.append(el('span',item.type==='movie'?'▶':'▤'));
 if(item.poster){const img=document.createElement('img');img.src=item.poster;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());poster.append(img);}
 const details=el('div',undefined,'title-card-content');details.append(el('h4',item.name),el('p',(item.year||'Year unavailable')+' · '+(item.type==='movie'?'Movie':'TV Show')));
 if(search){
  const c=collection();const saved=members(c).some(x=>x.id===item.id&&x.type===item.type);
  const add=button(saved?'Already saved':'Add to collection',async()=>{await api('items','POST',{collectionId:selected,id:item.id,type:item.type});await load(false);add.textContent='Already saved';add.disabled=true;notify('Title saved.');},'primary');add.disabled=saved;details.append(add);
 }else{
  const valid=state.collections.some(c=>!c.smart&&(c.kind==='all'||c.kind===item.type));
  if(valid)details.append(button('Also save to…',()=>openAssign(item),'secondary'));
  const c=collection();
  details.append(button(c.smart?'Remove everywhere':'Remove from this list',async()=>{
   if(c.smart){if(!confirm('Remove “'+item.name+'” from all your collections?'))return;await api('items','DELETE',{key:item.key});}
   else await api('membership','DELETE',{key:item.key,collectionId:c.id});
   await load(false);notify(c.smart?'Title removed from all collections.':'Title removed from this collection.');
  },'text-button danger'));
 }
 card.append(poster,details);return card;
}
function drawSaved(){const c=collection();if(!c)return;const q=$('saved-filter').value.toLowerCase();const items=members(c).filter(x=>(x.name+' '+x.year).toLowerCase().includes(q));$('saved-heading').textContent='Saved titles · '+members(c).length;$('saved-items').replaceChildren(...items.map(x=>card(x)));$('empty-state').hidden=items.length>0;if(!items.length&&q){$('empty-state').querySelector('h3').textContent='No matching saved titles.';$('empty-state').querySelector('p').textContent='Try another search within this collection.';}else{$('empty-state').querySelector('h3').textContent='Your next watch starts here.';$('empty-state').querySelector('p').textContent='Search above to add a title, or copy a saved title from another collection.';}}
function draw(){
 if(!state.collections.length)return;drawNav();const c=collection();if(!c)return;
 $('account-name').textContent=state.username+' / PERSONAL SPACE';$('collection-title').textContent=c.name;
 $('collection-description').textContent=c.smart?'Automatic collection · Includes all your saved '+(c.kind==='movie'?'movies':'TV shows'):(c.kind==='all'?'Movies and TV Shows':c.kind==='movie'?'Movies only':'TV Shows only')+' · Titles can belong to more than one collection';
 $('delete-collection').hidden=c.smart;$('move-up').disabled=state.collections[0].id===selected;$('move-down').disabled=state.collections.at(-1).id===selected;
 $('search-type').disabled=c.kind!=='all';if(c.kind!=='all')$('search-type').value=c.kind;drawSaved();
}
async function load(hideSearch=true){state=await api('me');if(!state.collections.some(x=>x.id===selected))selected=state.collections[0]?.id;$('auth-screen').hidden=true;$('recovery-screen').hidden=true;$('dashboard').hidden=false;if(hideSearch)$('search-section').hidden=true;draw();}
function openAssign(item){assignKey=item.key;$('assign-title').textContent=item.name;const cols=state.collections.filter(c=>!c.smart&&(c.kind==='all'||c.kind===item.type));$('assign-target').replaceChildren(...cols.map(c=>{const o=el('option',c.name);o.value=c.id;return o;}));dialog('assign-dialog');}
async function clipboard(value){try{await navigator.clipboard.writeText(value);notify('Copied.');}catch{notify('Copy was blocked. Select the text and copy it manually.',true);}}
$('tab-login').addEventListener('click',()=>setMode('login'));
$('tab-signup').addEventListener('click',()=>setMode('signup'));
$('recover-button').addEventListener('click',()=>setMode(authMode==='recover'?'login':'recover'));
$('auth-form').addEventListener('submit',run(async()=>{
 if(authMode!=='login'&&$('password').value!==$('confirm-password').value)throw Error('The passwords do not match.');
 const data={username:$('username').value,password:$('password').value};
 if(authMode==='recover')data.recoveryCode=$('recovery-input').value.trim();
 const r=await api(authMode,'POST',data);$('password').value='';$('confirm-password').value='';$('recovery-input').value='';
 if(authMode==='signup')showRecovery(r.recoveryCode,()=>load());
 else if(authMode==='recover')showRecovery(r.recoveryCode,()=>{showAuth();setMode('login');notify('Password reset. Sign in with your new password.');});
 else await load();
}));
$('copy-recovery').addEventListener('click',()=>clipboard($('recovery-code').value));
$('saved-code').addEventListener('change',()=>$('continue-button').disabled=!$('saved-code').checked);
$('continue-button').addEventListener('click',run(async()=>{$('recovery-code').value='';await recoveryNext();}));
$('logout').addEventListener('click',run(async()=>{await api('logout','POST');state=null;showAuth();setMode('login');}));
$('search-form').addEventListener('submit',run(async()=>{
 const c=collection(),type=c.kind==='all'?$('search-type').value:c.kind;$('search-section').hidden=false;$('search-status').textContent='Finding titles…';$('search-results').replaceChildren();
 try{const data=await api('search?q='+encodeURIComponent($('search-input').value.trim())+'&type='+type);$('search-status').textContent=data.items.length?'Choose a title to add to “'+collection().name+'”.':'No results. Try the original title or a shorter search.';$('search-results').replaceChildren(...data.items.map(x=>card(x,true)));}catch(e){$('search-status').textContent='Search did not complete. Please try again.';throw e;}
}));
$('close-search').addEventListener('click',()=>$('search-section').hidden=true);
$('saved-filter').addEventListener('input',drawSaved);
$('new-collection').addEventListener('click',()=>{$('collection-form').reset();dialog('collection-dialog');});
$('collection-form').addEventListener('submit',run(async()=>{const r=await api('collections','POST',{name:$('collection-name').value,kind:$('collection-kind').value});selected=r.id;$('collection-dialog').close();await load();notify('Collection created. Reinstall your personal link if Stremio keeps its old menu.');}));
$('rename-collection').addEventListener('click',run(async()=>{const c=collection(),name=prompt('New collection name:',c.name);if(name===null)return;await api('collections/'+c.id,'PATCH',{name});await load();notify('Collection renamed. Reinstall your personal link if Stremio keeps its old menu.');}));
$('delete-collection').addEventListener('click',run(async()=>{const c=collection();if(!confirm('Delete “'+c.name+'”? Its titles will remain in the automatic Movies or TV Shows collections.'))return;await api('collections/'+c.id,'DELETE');await load();notify('Collection deleted. Reinstall your personal link if Stremio keeps its old menu.');}));
async function move(delta){const ids=state.collections.map(x=>x.id),i=ids.indexOf(selected),j=i+delta;if(j<0||j>=ids.length)return;[ids[i],ids[j]]=[ids[j],ids[i]];await api('order','POST',{ids});await load();notify('Collection order saved.');}
$('move-up').addEventListener('click',run(()=>move(-1)));$('move-down').addEventListener('click',run(()=>move(1)));
$('assign-form').addEventListener('submit',run(async()=>{await api('membership','POST',{key:assignKey,collectionId:$('assign-target').value});$('assign-dialog').close();await load(false);notify('Title added to collection.');}));
$('show-install').addEventListener('click',run(async()=>{const r=await api('install','POST');$('install-url').value=r.url;$('install-link').href=r.url.replace(/^https?:/,'stremio:');dialog('install-dialog');}));
$('copy-install').addEventListener('click',()=>clipboard($('install-url').value));
$('install-dialog').addEventListener('close',()=>{$('install-url').value='';$('install-link').removeAttribute('href');});
$('show-settings').addEventListener('click',()=>{$('current-password').value='';$('new-password').value='';dialog('settings-dialog');});
$('settings-dialog').addEventListener('close',()=>{$('current-password').value='';$('new-password').value='';});
$('change-password').addEventListener('click',run(async()=>{await api('password','POST',{password:$('current-password').value,newPassword:$('new-password').value});state=null;showAuth();setMode('login');notify('Password changed. All sessions were signed out.');}));
$('new-recovery').addEventListener('click',run(async()=>{if(!confirm('Replace your recovery code? The old code will stop working.'))return;const r=await api('recovery-code','POST',{password:$('current-password').value});showRecovery(r.recoveryCode,()=>load());}));
$('rotate-link').addEventListener('click',run(async()=>{if(!confirm('Replace your installation link? Every old Stremio installation will stop loading your collections until you reinstall with the new link.'))return;await api('rotate-link','POST',{password:$('current-password').value});$('settings-dialog').close();notify('Installation link replaced. Choose Install in Stremio to get the new one.');}));
$('delete-account').addEventListener('click',run(async()=>{const confirmation=prompt('This permanently deletes your account and saved collections. Type DELETE to continue.');if(confirmation!=='DELETE')return;await api('account','POST',{password:$('current-password').value,confirm:confirmation});state=null;showAuth();setMode('login');notify('Account deleted.');}));
for(const b of document.querySelectorAll('[data-close]'))b.addEventListener('click',()=>$(b.dataset.close).close());
setMode('login');
load().catch(e=>{showAuth();if(e.message!=='Please sign in.')notify(e.message,true);});
