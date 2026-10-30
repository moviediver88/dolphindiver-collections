'use strict';
const crypto=require('node:crypto');
const {promisify}=require('node:util');
const derive=promisify(crypto.scrypt);
let active=0;
const digest=x=>crypto.createHash('sha256').update(x).digest('hex');
const token=()=>crypto.randomBytes(32).toString('base64url');
function equal(a,b){const aa=Buffer.from(a),bb=Buffer.from(b);return aa.length===bb.length&&crypto.timingSafeEqual(aa,bb);}
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
function username(x){if(typeof x!=='string'||!(/^[a-zA-Z0-9_.-]{3,32}$/).test(x))fail(400,'Use a username of 3–32 letters, numbers, dots, underscores or hyphens.');return x.toLowerCase();}
function password(x){if(typeof x!=='string'||x.length<12||x.length>128)fail(400,'Use a password between 12 and 128 characters.');return x;}
async function hashPassword(p){
 if(active>=2)fail(503,'The server is busy. Please try again shortly.');active++;
 try{const salt=crypto.randomBytes(16).toString('hex');const key=await derive(p,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024});return `scrypt$${salt}$${key.toString('hex')}`;}finally{active--;}
}
async function checkPassword(p,hash){
 if(typeof p!=='string'||p.length>128)return false;
 if(active>=2)fail(503,'The server is busy. Please try again shortly.');active++;
 try{const [,salt,expected]=hash.split('$');const key=await derive(p,salt,64,{N:131072,r:8,p:1,maxmem:160*1024*1024});return equal(key.toString('hex'),expected);}finally{active--;}
}
function secretBox(secret){const key=crypto.createHash('sha256').update(secret).digest();return {
 encrypt(value){const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv('aes-256-gcm',key,iv);const data=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64url');},
 decrypt(value){const b=Buffer.from(value,'base64url'),decipher=crypto.createDecipheriv('aes-256-gcm',key,b.subarray(0,12));decipher.setAuthTag(b.subarray(12,28));return Buffer.concat([decipher.update(b.subarray(28)),decipher.final()]).toString();}
};}
module.exports={digest,token,equal,fail,username,password,hashPassword,checkPassword,secretBox};
