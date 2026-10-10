import { randomBytes, randomUUID, createHash, createHmac, timingSafeEqual } from 'node:crypto';
import questions from './questions.json' with { type: 'json' };
const LANGS=new Set(['en','it']),SCHOOLS=new Set(['polimi','polito','both']);
const hash=x=>createHash('sha256').update(x).digest('hex');
function fail(status,message){throw Object.assign(new Error(message),{status})}
function equal(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)}
function cleanNickname(value){if(typeof value!=='string')fail(400,'Enter a nickname.');const s=String(value||'').normalize('NFKC').trim();if(s.length<2||s.length>22||/[<>\u0000-\u001f\u007f]/u.test(s))fail(400,'Use a nickname of 2–22 characters.');return s}
function validateProfile(b){if(!LANGS.has(b.examLanguage)||!SCHOOLS.has(b.school))fail(400,'Choose an exam language and university.');return{nickname:cleanNickname(b.nickname),school:b.school,examLanguage:b.examLanguage}}
export function dayKey(now){return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Tokyo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now))}
export function weekKey(now){const d=new Date(now);d.setUTCHours(0,0,0,0);d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}
const schoolMatches=(p,s)=>s==='all'||p.school===s||p.school==='both';
export function aggregateBoard(profiles,practice,mocks,{examLanguage='en',school='all',now=Date.now(),viewerId=null,dailyReceipts=practice}={}){
 const week=weekKey(now),profileMap=new Map(profiles.map(p=>[p.id,p]));
 const scopedProfiles=profiles.filter(p=>schoolMatches(p,school));
 const counts={en:scopedProfiles.filter(p=>p.examLanguage==='en').length,it:scopedProfiles.filter(p=>p.examLanguage==='it').length};
 const stats=new Map();
 const completed=new Set(practice.filter(a=>a.type==='set-receipt').map(a=>`${a.participantId}|${a.examLanguage}|${a.id}`));
 for(const a of [...practice].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))){
  if(a.type==='set-receipt'||a.type==='first-answer'&&!completed.has(`${a.participantId}|${a.examLanguage}|${a.sessionId}`))continue;
  const p=profileMap.get(a.participantId);if(!p||!schoolMatches(p,school)||a.week!==week||a.examLanguage!==examLanguage)continue;
  let s=stats.get(p.id);if(!s){s={id:p.id,nickname:p.nickname,school:p.school,correct:0,answered:0,seen:new Set()};stats.set(p.id,s)}
  for(const answer of a.answers){if(s.seen.has(answer.questionId))continue;s.seen.add(answer.questionId);s.answered++;if(answer.correct)s.correct++}
 }
 const ranked=[...stats.values()].map(s=>({id:s.id,nickname:s.nickname,school:s.school,points:s.correct-(s.answered-s.correct)*.25,answered:s.answered,accuracy:Math.round(s.correct/Math.max(1,s.answered)*100)})).sort((a,b)=>b.points-a.points||b.accuracy-a.accuracy||a.nickname.localeCompare(b.nickname)||a.id.localeCompare(b.id));
 // Equal score and accuracy share a rank; registration time never decides a tie.
 ranked.forEach((r,i)=>r.rank=i&&r.points===ranked[i-1].points&&r.accuracy===ranked[i-1].accuracy?ranked[i-1].rank:i+1);
 const today=dayKey(now),dailyStats=new Map();
 for(const a of [...dailyReceipts].sort((a,b)=>a.createdAt-b.createdAt||a.id.localeCompare(b.id))){
  if(!['set-receipt','daily-answer'].includes(a.type)||dayKey(a.createdAt)!==today||a.examLanguage!==examLanguage)continue;
  const p=profileMap.get(a.participantId);if(!p||!schoolMatches(p,school))continue;
  let s=dailyStats.get(p.id);if(!s){s={id:p.id,nickname:p.nickname,school:p.school,sets:0,correct:0,answered:0,seen:new Set(),seenSets:new Set()};dailyStats.set(p.id,s)}
  if(a.type==='set-receipt'&&!s.seenSets.has(a.id)){s.seenSets.add(a.id);s.sets++;}
  for(const answer of a.answers){const answerKey=(a.sessionId||a.id)+'|'+answer.questionId;if(dayKey(answer.answeredAt||a.createdAt)!==today||s.seen.has(answerKey))continue;s.seen.add(answerKey);s.answered++;if(answer.correct)s.correct++;}
 }
 const daily=[...dailyStats.values()].map(({seen,seenSets,...s})=>({...s,points:s.correct,accuracy:Math.round(s.correct/Math.max(1,s.answered)*100)})).sort((a,b)=>b.points-a.points||a.nickname.localeCompare(b.nickname)||a.id.localeCompare(b.id));
 daily.forEach((r,i)=>r.rank=i&&r.points===daily[i-1].points?daily[i-1].rank:i+1);
 const latest=new Map();
 for(const m of mocks){const p=profileMap.get(m.participantId);if(!p||!schoolMatches(p,school)||m.examLanguage!==examLanguage)continue;const prev=latest.get(p.id);if(m.latestPointer||!prev||!prev.latestPointer&&(m.createdAt>prev.createdAt||(m.createdAt===prev.createdAt&&m.id>prev.id)))latest.set(p.id,m)}
 const mockRanked=[...latest.values()].map(m=>{const p=profileMap.get(m.participantId);return{id:p.id,nickname:p.nickname,school:p.school,score:m.score,test:m.test,reportedAt:m.createdAt,source:'self-reported'}}).sort((a,b)=>b.score-a.score||a.nickname.localeCompare(b.nickname)||a.id.localeCompare(b.id));
 mockRanked.forEach((r,i)=>r.rank=i&&r.score===mockRanked[i-1].score?mockRanked[i-1].rank:i+1);
 const histogram=[{from:-12.5,to:0,label:'<0',count:0},...Array.from({length:10},(_,i)=>({from:i*5,to:(i+1)*5,label:String(i*5),count:0}))];
 for(const r of mockRanked){const i=r.score<0?0:Math.min(10,1+Math.floor(r.score/5));histogram[i].count++}
 return{version:2,day:today,dayTimeZone:'Asia/Tokyo',daily:daily.slice(0,100),dailyTotal:daily.length,myDaily:daily.find(p=>p.id===viewerId)||null,weekStart:week,examLanguage,school,counts,practice:ranked.slice(0,100),practiceTotal:ranked.length,
  myPractice:ranked.find(p=>p.id===viewerId)||null,mocks:mockRanked.slice(0,100),mockTotal:mockRanked.length,myMock:mockRanked.find(p=>p.id===viewerId)||null,histogram,updatedAt:now};
}
export function createCompetitionHandler(store,{clock=()=>Date.now(),resolveMember=null}={}){
 async function signingKey(){let key=await store.getJSON('private/signing-key');if(!key){const candidate={value:randomBytes(32).toString('hex')};await store.putJSON('private/signing-key',candidate,{onlyIfNew:true});key=await store.getJSON('private/signing-key')}if(!key)fail(503,'Storage unavailable.');return key.value}
 async function authenticate(request){const auth=request.headers.get('authorization')||'',m=/^Bearer ([a-f0-9-]{36})\.([a-f0-9]{64})$/.exec(auth);if(!m)fail(401,'Join the ranking first.');const p=await store.getJSON('profiles/'+m[1]);if(!p||!equal(p.accessHash,hash(m[2])))fail(401,'Profile access expired.');return p}
 function sign(payload,key){const raw=Buffer.from(JSON.stringify(payload)).toString('base64url');return raw+'.'+createHmac('sha256',key).update(raw).digest('base64url')}
 function decode(token,key){if(typeof token!=='string'||token.length>6000)fail(400,'Invalid practice session.');const [raw,mac,...extra]=token.split('.');if(extra.length||!equal(mac,createHmac('sha256',key).update(raw||'').digest('base64url')))fail(400,'Invalid practice session.');try{return JSON.parse(Buffer.from(raw,'base64url').toString())}catch{fail(400,'Invalid practice session.')}}
 function json(body,status=200){return new Response(JSON.stringify(body),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})}
 return async request=>{
  try{
   const url=new URL(request.url),now=clock();
   let accountProfile=null;
   if(resolveMember){const member=await resolveMember(request);if(!member)fail(403,'An active membership is required.');if(!member.username||/^Learner-[a-f0-9]{6}$/.test(member.username))fail(409,'Choose your username in Account first.');
    const rawId=hash('ranking-account:'+member.id),id=[rawId.slice(0,8),rawId.slice(8,12),rawId.slice(12,16),rawId.slice(16,20),rawId.slice(20,32)].join('-'),previous=await store.getJSON('profiles/'+id);
    accountProfile={...previous,id,memberId:member.id,nickname:member.username,school:SCHOOLS.has(member.school)?member.school:'both',examLanguage:previous?.examLanguage||'en',createdAt:previous?.createdAt||now};
    if(!previous||previous.nickname!==accountProfile.nickname||previous.school!==accountProfile.school)await store.putJSON('profiles/'+id,accountProfile);
   }

   if(request.method==='GET'){
    const lang=url.searchParams.get('exam')||'en',school=url.searchParams.get('school')||'all';if(!LANGS.has(lang)||!['all',...SCHOOLS].includes(school))fail(400,'Invalid ranking filter.');
    let viewer=accountProfile;if(!viewer&&request.headers.has('authorization'))viewer=await authenticate(request);
    const [profiles,practice,mocks,dailyReceipts]=await Promise.all([store.listJSON('profiles/'),store.listJSON('practice/'+weekKey(now)+'/'),store.listJSON('mocks/'+lang+'/'),store.listJSON('daily/'+dayKey(now)+'/')]);
    return json({...aggregateBoard(profiles,practice,mocks,{examLanguage:lang,school,now,viewerId:viewer?.id,dailyReceipts}),profile:accountProfile?{id:accountProfile.id,nickname:accountProfile.nickname,school:accountProfile.school,examLanguage:accountProfile.examLanguage}:null});
   }
   if(request.method!=='POST')return json({error:'Method not allowed.'},405);
   const origin=request.headers.get('origin');if(origin&&origin!==url.origin)fail(403,'Use the site to submit results.');
   const raw=await request.text();if(Buffer.byteLength(raw)>16000)fail(413,'Request too large.');let body;try{body=JSON.parse(raw)}catch{fail(400,'Invalid request.')}
   if(!body||typeof body!=='object'||Array.isArray(body))fail(400,'Invalid request.');
   if(accountProfile&&['join','profile'].includes(body.action)){if(!LANGS.has(body.examLanguage))fail(400,'Choose an exam language.');accountProfile.examLanguage=body.examLanguage;await store.putJSON('profiles/'+accountProfile.id,accountProfile);return json({profile:{id:accountProfile.id,nickname:accountProfile.nickname,school:accountProfile.school,examLanguage:accountProfile.examLanguage},accountLinked:true})}
   if(body.action==='join'){
    const profile=validateProfile(body),id=randomUUID(),token=randomBytes(32).toString('hex');
    const p={id,...profile,accessHash:hash(token),createdAt:now,updatedAt:now};await store.putJSON('profiles/'+id,p,{onlyIfNew:true});
    if(!(await store.getJSON('profiles/'+id)))fail(503,'Profile could not be saved.');
    return json({profile:{id,...profile},token:id+'.'+token},201);
   }
   const p=accountProfile||await authenticate(request);
   if(body.action==='profile'){
    const profile=validateProfile(body);await store.putJSON('profiles/'+p.id,{...p,...profile,updatedAt:now});return json({profile:{id:p.id,...profile}});
   }
   if(body.action==='challenge'){
    if(!LANGS.has(body.examLanguage)||!Array.isArray(body.questionIds)||body.questionIds.length!==10||new Set(body.questionIds).size!==10)fail(400,'A practice session needs ten distinct questions.');
    const q=body.questionIds.map(id=>questions[id]);if(q.some(q=>!q?.ready||!q.languages.includes(body.examLanguage))||new Set(q.map(q=>q.nodeId)).size!==10)fail(400,'This set does not match the selected exam scope.');
    const session={id:randomUUID(),participantId:p.id,examLanguage:body.examLanguage,questionIds:body.questionIds,createdAt:now,expiresAt:now+24*60*60*1000};
    return json({challenge:sign(session,await signingKey()),expiresAt:session.expiresAt});
   }
   if(body.action==='answer'){
    const session=decode(body.challenge,await signingKey());if(session.participantId!==p.id||session.expiresAt<now||session.createdAt>now)fail(400,'This practice session has expired.');
    const id=body.questionId,q=questions[id];if(!session.questionIds.includes(id)||!q?.ready||!q.choices.includes(body.answer))fail(400,'An answer does not belong to its question.');
    if(await store.getJSON(`receipts/${session.examLanguage}/${p.id}/${session.id}`))return json({ok:true,duplicate:true});
    const receiptKey=`answer-receipts/${p.id}/${session.id}/${id}`;
    await store.putJSON(receiptKey,{id:session.id+'-'+id,sessionId:session.id,type:'daily-answer',participantId:p.id,examLanguage:session.examLanguage,answers:[{questionId:id,correct:body.answer===q.answer}],answer:body.answer,createdAt:now},{onlyIfNew:true});
    const receipt=await store.getJSON(receiptKey);if(!receipt)fail(503,'Result could not be saved.');
    const dailyKey=`daily/${dayKey(receipt.createdAt)}/${session.examLanguage}/${p.id}/answer-${session.id}-${id}`;
    await store.putJSON(dailyKey,receipt,{onlyIfNew:true});if(!(await store.getJSON(dailyKey)))fail(503,'Daily result could not be saved.');
    return json({ok:true,correct:receipt.answers[0].correct,points:receipt.answers[0].correct?1:0});
   }
   if(body.action==='practice'){
    const session=decode(body.challenge,await signingKey());if(session.participantId!==p.id||session.expiresAt<now||session.createdAt>now)fail(400,'This practice session has expired.');
    if(!Array.isArray(body.answers)||body.answers.length!==10)fail(400,'Submit ten answers.');
    const answerMap=new Map();for(const a of body.answers){if(!a||typeof a.questionId!=='string'||typeof a.answer!=='string'||answerMap.has(a.questionId))fail(400,'Invalid answer list.');answerMap.set(a.questionId,a.answer)}
    const answeredTimes=new Map();for(const id of session.questionIds){const saved=await store.getJSON(`answer-receipts/${p.id}/${session.id}/${id}`);if(saved){answerMap.set(id,saved.answer);answeredTimes.set(id,saved.createdAt);}}
    const answers=session.questionIds.map(id=>{const q=questions[id],a=answerMap.get(id);if(!q?.ready||!q.languages.includes(session.examLanguage)||!q.choices.includes(a))fail(400,'An answer does not belong to its question.');return{questionId:id,correct:a===q.answer,answeredAt:answeredTimes.get(id)||now}});
    const week=weekKey(now),key=`practice/${week}/${session.examLanguage}/${p.id}/${session.id}`;
    const dailyKey=`daily/${dayKey(now)}/${session.examLanguage}/${p.id}/set-${session.id}`;
    const receiptKey=`receipts/${session.examLanguage}/${p.id}/${session.id}`;
    const previous=await store.getJSON(key)||await store.getJSON(receiptKey);if(previous){const originalKey=`daily/${dayKey(previous.createdAt)}/${session.examLanguage}/${p.id}/set-${session.id}`;await store.putJSON(receiptKey,previous,{onlyIfNew:true});await store.putJSON(originalKey,previous,{onlyIfNew:true});return json({ok:true,duplicate:true,correct:previous.correct,score:previous.score});}
    const correct=answers.filter(a=>a.correct).length,score=correct-(10-correct)*.25;
    // Atomic per-question claims preserve the first submitted answer even if
    // two different sets arrive in the same millisecond or on separate workers.
    for(const answer of answers){
     const claim=`practice/${week}/${session.examLanguage}/${p.id}/first-${answer.questionId}`;
     await store.putJSON(claim,{id:'first-'+answer.questionId,type:'first-answer',sessionId:session.id,participantId:p.id,examLanguage:session.examLanguage,week,answers:[answer],createdAt:now},{onlyIfNew:true});
     if(!(await store.getJSON(claim)))fail(503,'Result could not be saved.');
    }
    await store.putJSON(key,{id:session.id,type:'set-receipt',participantId:p.id,examLanguage:session.examLanguage,week,answers,correct,score,createdAt:now},{onlyIfNew:true});
    const receipt=await store.getJSON(key);if(!receipt)fail(503,'Result could not be saved.');await store.putJSON(receiptKey,receipt,{onlyIfNew:true});if(!(await store.getJSON(receiptKey)))fail(503,'Result could not be saved.');await store.putJSON(dailyKey,receipt,{onlyIfNew:true});if(!(await store.getJSON(dailyKey)))fail(503,'Daily result could not be saved.');return json({ok:true,correct,score});
   }
   if(resolveMember&&body.action==='mock')fail(404,'Not available.');
   if(body.action==='mock'){
    if(!LANGS.has(body.examLanguage)||typeof body.score!=='number'||!Number.isFinite(body.score)||body.score< -12.5||body.score>50||!Number.isInteger(body.score*4)||!['CISIA','Other'].includes(body.test))fail(400,'Enter a /50 score in steps of 0.25.');
    if(typeof body.reportId!=='string'||!/^[a-f0-9-]{36}$/.test(body.reportId))fail(400,'Invalid report identifier.');
    const key=`mocks/${body.examLanguage}/${p.id}/${body.reportId}`,previous=await store.getJSON(key);
    if(previous){if(previous.score!==body.score||previous.test!==body.test)fail(409,'A different result already uses this identifier.');return json({ok:true,duplicate:true})}
    const record={id:body.reportId,participantId:p.id,examLanguage:body.examLanguage,score:body.score,test:body.test,createdAt:now,source:'self-reported'};
    await store.putJSON(key,record,{onlyIfNew:true});
    await store.putJSON(`mocks/${body.examLanguage}/${p.id}/latest`,{...record,latestPointer:true});
    if(!(await store.getJSON(key)))fail(503,'Report could not be saved.');return json({ok:true});
   }
   fail(400,'Unknown action.');
  }catch(e){return json({error:e.status?e.message:'Rankings are temporarily unavailable.'},e.status||503)}
 };
}
