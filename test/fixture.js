'use strict';
const {PGlite}=require('@electric-sql/pglite');
const fs=require('node:fs');
const path=require('node:path');
async function database(){const engine=new PGlite();await engine.exec(fs.readFileSync(path.join(__dirname,'..','schema.sql'),'utf8'));return {engine,query:(s,p)=>engine.query(s,p),connect:async()=>({query:(s,p)=>engine.query(s,p),release(){}}),end:()=>engine.close()};}
const titles={
 'tt0371746':{id:'tt0371746',type:'movie',name:'Iron Man',year:'2008',poster:'https://images.metahub.space/poster/small/tt0371746/img'},
 'tt9140554':{id:'tt9140554',type:'series',name:'Loki',year:'2021–2023',poster:'https://images.metahub.space/poster/small/tt9140554/img'}
};
const metadata={search:async(q,t)=>Object.values(titles).filter(x=>x.type===t&&x.name.toLowerCase().includes(q.toLowerCase())),lookup:async(id,t)=>{if(titles[id]?.type!==t){const e=Error('No matching title was found.');e.status=404;throw e;}return titles[id];}};
module.exports={database,metadata};
