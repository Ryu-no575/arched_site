import {promisify} from 'node:util';
import {cleanStudy,readStudy,studySummary} from './study58.mjs';
import {productAccess59} from './products59.mjs';
import {createBilling} from './billing.mjs';
const scrypt=promisify(scryptCallback);
import {randomBytes,createHash,timingSafeEqual,scrypt as scryptCallback} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const deployedRoot=resolve(process.env.LAMBDA_TASK_ROOT||process.cwd(),'private');
const root=existsSync(deployedRoot+'/manifest.json')?deployedRoot+'/':fileURLToPath(new URL('../private/',import.meta.url));
const hash=s=>createHash('sha256').update(String(s)).digest('hex');
const safeEqual=(a,b)=>timingSafeEqual(Buffer.from(hash(a)),Buffer.from(hash(b)));
const email=s=>String(s||'').trim().toLowerCase();
const validEmail=s=>s.length<=254&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const headers={'cache-control':'no-store, private','x-content-type-options':'nosniff','referrer-policy':'same-origin','vary':'Cookie'};
const json=(data,status=200,extra={})=>new Response(JSON.stringify(data),{status,headers:{...headers,'content-type':'application/json',...extra}});
export function createAccessHandler(store,env=process.env,now=()=>Date.now(),transport=fetch,assets={}){
 const billing=createBilling(store,env,now,transport);
 const cookie=(name,value,req,age=2592000)=>`${name}=${value}; Path=/; HttpOnly; SameSite=Lax${age===null?'':`; Max-Age=${age}`}${new URL(req.url).hostname==='localhost'||new URL(req.url).hostname==='127.0.0.1'?'':'; Secure'}`;
 async function session(req,admin=false){const name=admin?'arched_admin':'arched_member';const token=(req.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(name+'='))?.slice(name.length+1);if(!token)return null;const s=await store.getJSON('session/'+hash(token));if(!s||s.until<=now()||s.admin!==admin)return null;if(admin)return s;const m=await store.getJSON('member/'+s.id);return m&&!m.disabled?{...s,member:m}:null}
 async function paid(req){const s=await session(req);return s&&(await productAccess59(store,s.id,s.member,now())).basic?s:null}
 async function rate(req,key){const ip=req.headers.get('x-nf-client-connection-ip')||req.headers.get('x-local-client-ip')||'unknown';const k='attempt/'+hash(ip+'|'+key),t=await store.getJSON(k),row=t&&now()-t.start<900000?t:{start:now(),count:0};row.count++;await store.putJSON(k,row);return row.count<=8}
 async function login(req,admin,b){const id=email(b.email);if(!await rate(req,admin?'admin':id))return json({error:'Too many attempts. Try again in 15 minutes.'},429);
  let m;if(admin){if(!env.ARCHED_ADMIN_PASSWORD||env.ARCHED_ADMIN_PASSWORD.length<16)return json({error:'Owner access is not configured.'},503);if(!safeEqual(b.password||'',env.ARCHED_ADMIN_PASSWORD))return json({error:'Sign-in failed.'},401)}else{m=validEmail(id)&&await store.getJSON('member/'+hash(id));if(!m||m.disabled||!(b.password?await checkPassword(b.password,m.passwordHash):m.codeHash&&safeEqual(hash(b.code||''),m.codeHash)))return json({error:'Check your email and password or access code.'},401)}
  if(!admin){m={...m,lastLoginAt:new Date(now()).toISOString()};await store.putJSON('member/'+hash(id),m)}
  const remembered=admin||b.remember!==false&&b.remember!=='false',age=remembered?2592000:43200;const token=randomBytes(32).toString('base64url');await store.putJSON('session/'+hash(token),{admin,id:admin?'owner':hash(id),until:now()+age*1000});return json({ok:true},200,{'set-cookie':cookie(admin?'arched_admin':'arched_member',token,req,remembered?age:null)})
 }
 return async req=>{
  try{
   const u=new URL(req.url),action=u.searchParams.get('action')||'status';
   if(action==='stripe-webhook'&&req.method==='POST')return billing.webhook(req);
   if(req.method==='POST'&&req.headers.get('origin')!==u.origin)return json({error:'Invalid request origin.'},403);
   if(!['GET','POST'].includes(req.method))return json({error:'Method not allowed.'},405);
   let b={};if(req.method==='POST'){const body=await req.text();if(body.length>(action==='study'?2000000:8000))return json({error:'Request too large.'},413);try{b=JSON.parse(body)}catch{return json({error:'Invalid request.'},400)}}
   if(action==='config'){let catalog;try{catalog=await billing.catalog()}catch{catalog={basic:{available:false},mock:{available:false,status:'not_released'}}}return json({billingReady:!!catalog.basic.available,catalog,contact:validURL(env.ARCHED_CONTACT_URL)})}
   if(action==='register'&&req.method==='POST'){const e=email(b.email);if(!validUsername(b.username))return json({error:'Use a username of 3–24 letters, numbers, spaces, underscores or hyphens.'},400);if(!validEmail(e)||typeof b.password!=='string'||b.password.length<12||b.password.length>128)return json({error:'Use a valid email and a password of 12–128 characters.'},400);if(!await rate(req,'register'))return json({error:'Too many attempts. Try again later.'},429);const key='member/'+hash(e);if(await store.getJSON(key))return json({error:'An account already exists. Sign in instead.'},409);const salt=randomBytes(16).toString('hex'),derived=await scrypt(b.password,salt,64);const saved=await store.putJSON(key,{email:e,username:validUsername(b.username)?String(b.username).trim():'Learner-'+randomBytes(3).toString('hex'),passwordHash:salt+':'+derived.toString('hex'),paidUntil:new Date(0).toISOString(),disabled:false,createdAt:new Date(now()).toISOString()},{onlyIfNew:true});if(saved?.modified===false)return json({error:'An account already exists. Sign in instead.'},409);return login(req,false,b)}
   if(['checkout','portal'].includes(action)&&req.method==='POST'){const signed=await session(req);if(!signed)return json({error:'Sign in first.'},401);const result=await billing[action](signed,b.product||'basic');const {status,...body}=result;return json(body,status||200)}
   if(action==='login'&&req.method==='POST')return login(req,false,b);
   if(action==='owner-login'&&req.method==='POST')return login(req,true,b);
   if(action==='logout'&&req.method==='POST'){for(const name of ['arched_admin','arched_member']){const t=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);if(t)await store.putJSON('session/'+hash(t),{until:0,admin:name==='arched_admin'})}const h=new Headers({...headers,'content-type':'application/json'});h.append('set-cookie',cookie('arched_member','',req,0));h.append('set-cookie',cookie('arched_admin','',req,0));return new Response('{"ok":true}',{headers:h})}
   if(action.startsWith('owner-')){
    if(!await session(req,true))return json({error:'Owner sign-in required.'},401);
    if(action==='owner-members'&&req.method==='GET'){const rows=await store.listJSON('member/'),summaries=await store.listJSON('summary/'),by=new Map(summaries.map(r=>[r.userId,r]));return json({members:(await Promise.all(rows.map(async({codeHash,passwordHash,...m})=>({...m,userId:hash(m.email),access:await productAccess59(store,hash(m.email),m,now()),study:by.get(hash(m.email))||null})))).sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||''))})}
    if(action==='owner-user'&&req.method==='GET'){const e=email(u.searchParams.get('email'));if(!validEmail(e))return json({error:'Invalid email.'},400);const m=await store.getJSON('member/'+hash(e));if(!m)return json({error:'Member not found.'},404);const {codeHash,passwordHash,...member}=m,snapshot=await readStudy(store,hash(e));return json({member:{...member,userId:hash(e),access:await productAccess59(store,hash(e),m,now())},purchases:await store.listJSON('purchase/'+hash(e)+'/'),summary:snapshot?studySummary(snapshot):null,recentRounds:(snapshot?.practice?.history||[]).slice(-30).reverse()})}
    if(action==='owner-grant'&&req.method==='POST'){
     const e=email(b.email),until=Date.parse(b.paidUntil);if(!validEmail(e)||!Number.isFinite(until)||until<=now()||until>now()+370*86400000)return json({error:'Enter an email and a future paid-through date within one year.'},400);
     const id=hash(e),old=await store.getJSON('member/'+id);const code=!old||b.rotate?randomBytes(24).toString('base64url'):null;
     const m={...old,email:e,paidUntil:new Date(until).toISOString(),codeHash:code?hash(code):old.codeHash,disabled:false,paymentReference:String(b.paymentReference||'').slice(0,160),updatedAt:new Date(now()).toISOString()};await store.putJSON('member/'+id,m);return json({ok:true,code,email:e,paidUntil:m.paidUntil})
    }
    if(action==='owner-revoke'&&req.method==='POST'){const id=hash(email(b.email)),m=await store.getJSON('member/'+id);if(!m)return json({error:'Member not found.'},404);await store.putJSON('member/'+id,{...m,disabled:true});return json({ok:true})}
    return json({error:'Not found.'},404)
   }
   if(action==='status'){const s=await session(req),access=s?await productAccess59(store,s.id,s.member,now()):{basic:false,mock:false};return json({signedIn:!!s,active:access.basic,access,email:s?.member.email,userId:s?.id,username:s?.member.username||'',needsUsername:!!s&&(!validUsername(s.member.username)||/^Learner-[a-f0-9]{6}$/.test(s.member.username)),school:s?.member.school||'',paidUntil:access.basicUntil||s?.member.paidUntil,billingReady:billing.ready(),billingStatus:s?.member.billingStatus||null,hasSubscription:!!s?.member.stripeSubscriptionId,cancelAtPeriodEnd:!!s?.member.cancelAtPeriodEnd,mode:env.ARCHED_BILLING_MODE==='one_time'?'one_time':'subscription'})}
   if(action==='profile'&&req.method==='POST'){const signed=await session(req);if(!signed)return json({error:'Sign in first.'},401);if(!validUsername(b.username)||!['','polimi','polito','both'].includes(b.school||''))return json({error:'Check your username and university.'},400);const member={...signed.member,username:String(b.username).trim(),school:b.school||'',updatedAt:new Date(now()).toISOString()};await store.putJSON('member/'+signed.id,member);return json({ok:true,username:member.username,school:member.school})}
   if(action==='study'){const signed=await paid(req);if(!signed)return json({error:'An active membership is required.'},403);if(req.method==='GET')return json({snapshot:await readStudy(store,signed.id),savedAt:(await store.getJSON('summary/'+signed.id))?.lastSyncAt||0});if(!/^[a-zA-Z0-9_-]{16,80}$/.test(b.deviceId||''))return json({error:'Invalid device.'},400);let snapshot;try{snapshot=cleanStudy(b.snapshot)}catch(e){return json({error:e.message},400)}await store.putJSON('study/'+signed.id+'/'+b.deviceId,{snapshot,savedAt:now()});const merged=await readStudy(store,signed.id);await store.putJSON('summary/'+signed.id,{userId:signed.id,...studySummary(merged,now())});return json({ok:true,savedAt:now()})}
   if(!await paid(req))return json({error:'An active membership is required.'},403);
   let file,type;
   if(action==='bundle'){file='client/bundle.json';type='application/json'}
   else if(action==='manifest'){file='client/manifest.json';type='application/json'}
   else if(action==='app'){file='client/app.html';type='text/html; charset=utf-8'}
   else if(action==='data'){const name=u.searchParams.get('name')||'',part=u.searchParams.get('part')||'';if(!/^[A-Za-z0-9_]+$/.test(name)||!/^\d{1,3}$/.test(part))return json({error:'Not found.'},404);file=`client/data/${name}-${part}.jsonpart`;type='text/plain; charset=utf-8'}
   else if(action==='script'){const name=u.searchParams.get('name')||'';if(!/^script-\d\.js$/.test(name))return json({error:'Not found.'},404);file=name;type='text/javascript; charset=utf-8'}
   else if(action==='media'){const name=u.searchParams.get('name')||'';if(!/^[a-f0-9]{24}\.(jpg|png|webp|gif|svg)$/.test(name))return json({error:'Not found.'},404);file='media/'+name;type={'jpg':'image/jpeg','png':'image/png','webp':'image/webp','gif':'image/gif','svg':'image/svg+xml'}[name.split('.').pop()]}
   else return json({error:'Not found.'},404);
   try{
    const h={...headers,'content-type':type};
    // Conditional image responses always follow the paid-member check above.
    if(action==='media'){
     const etag='"'+file.slice(6)+'"';h['cache-control']='private, no-cache';h.etag=etag;
     if(req.headers.get('if-none-match')===etag)return new Response(null,{status:304,headers:h});
    }
    let bytes;
    if(action!=='media'&&/\bgzip\b(?!\s*;\s*q=0(?:\.0*)?(?:,|$))/i.test(req.headers.get('accept-encoding')||'')){
     try{bytes=await readFile(root+file+'.gz');h['content-encoding']='gzip';h.vary='Cookie, Accept-Encoding';}catch(e){if(e.code!=='ENOENT')throw e;}
    }
    if(!bytes&&action==='media'&&assets.readMedia){
     bytes=await assets.readMedia(file.slice(6));
     if(bytes==null)return json({error:'Photograph unavailable.'},404);
    }
    if(!bytes)bytes=await readFile(root+file);
    return new Response(bytes,{headers:h});
   }catch(e){if(e.code==='ENOENT')return json({error:'Not found.'},404);throw e}
  }catch{return json({error:'Request failed. Try again.'},500)}
 }
 async function authorize(req){return paid(req)}
}
function validURL(value){try{const u=new URL(value);return u.protocol==='https:'?u.href:null}catch{return null}}
export async function activeMember61(req,store,now=Date.now()){
 const t=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('arched_member='))?.slice(14);if(!t)return null;
 const s=await store.getJSON('session/'+hash(t));if(!s||s.admin||s.until<=now)return null;const m=await store.getJSON('member/'+s.id);if(!m||!(await productAccess59(store,s.id,m,now)).basic)return null;
 return {id:s.id,username:m.username||'',school:m.school||''};
}
export async function isActiveMember(req,store,now=Date.now()){return !!await activeMember61(req,store,now)}

async function checkPassword(password,stored){if(typeof password!=='string'||password.length>128||!stored)return false;const [salt,hash]=stored.split(':');if(!/^[a-f0-9]{32}$/.test(salt||'')||!/^[a-f0-9]{128}$/.test(hash||''))return false;const derived=await scrypt(password,salt,64);return timingSafeEqual(derived,Buffer.from(hash,'hex'))}

function validUsername(v){return typeof v==='string'&&v.trim().length>=3&&v.trim().length<=24&&/^[\p{L}\p{N} _-]+$/u.test(v.trim())}
