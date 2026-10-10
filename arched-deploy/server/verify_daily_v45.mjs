import assert from 'node:assert/strict';
import {aggregateBoard,createCompetitionHandler,dayKey} from './competition.mjs';
import questions from './questions.json' with {type:'json'};
assert.equal(dayKey(Date.parse('2026-10-02T14:59:59Z')),'2026-10-02');
assert.equal(dayKey(Date.parse('2026-10-02T15:00:00Z')),'2026-10-03');
let now=Date.parse('2026-10-04T23:59:00Z');const records=new Map();
const store={async getJSON(k){return records.has(k)?structuredClone(records.get(k)):null},async putJSON(k,v,{onlyIfNew}={}){if(!onlyIfNew||!records.has(k))records.set(k,structuredClone(v))},async listJSON(prefix){return [...records].filter(([k])=>k.startsWith(prefix)).map(([,v])=>structuredClone(v))}};
const handler=createCompetitionHandler(store,{clock:()=>now});
async function req(body,token,query='?exam=en&school=all'){const r=await handler(new Request('http://localhost/.netlify/functions/competition'+query,{method:body?'POST':'GET',headers:{...(token?{authorization:'Bearer '+token}:{}),...(body?{'content-type':'application/json'}:{})},body:body?JSON.stringify(body):undefined}));return {status:r.status,data:await r.json()}}
const a=await req({action:'join',nickname:'Daily A',school:'polimi',examLanguage:'en'}),b=await req({action:'join',nickname:'Daily B',school:'polito',examLanguage:'en'});
const seen=new Set(),pool=Object.keys(questions).filter(id=>{const q=questions[id];if(!q.ready||!q.languages.includes('en')||seen.has(q.nodeId))return false;seen.add(q.nodeId);return true}),first=pool.slice(0,10),second=pool.slice(10,20);
async function complete(ids,token,correct=10){const c=await req({action:'challenge',examLanguage:'en',questionIds:ids},token);assert.equal(c.status,200);const answers=ids.map((id,i)=>({questionId:id,answer:i<correct?questions[id].answer:questions[id].choices.find(x=>x!==questions[id].answer)}));const r=await req({action:'practice',challenge:c.data.challenge,answers,score:100000},token);assert.equal(r.status,200);assert.equal(r.data.correct,correct);return {c,answers}}
const round=await complete(first,a.data.token,7);await complete(first.slice().reverse(),a.data.token,10);await complete(first,b.data.token,10);
let board=(await req(null,a.data.token)).data;assert.equal(board.version,2);assert.equal(board.myDaily.sets,1);assert.equal(board.myDaily.accuracy,70);assert.deepEqual(board.daily.map(p=>p.rank),[1,1]);assert.equal(board.dayTimeZone,'Asia/Tokyo');
// A UTC week change must not erase rounds from the same local day.
now=Date.parse('2026-10-05T00:01:00Z');const replay=await req({action:'practice',challenge:round.c.data.challenge,answers:round.answers},a.data.token);assert(replay.data.duplicate);board=(await req(null,a.data.token)).data;assert.equal(board.myDaily.sets,1);assert.equal(board.dailyTotal,2);
await complete(second,a.data.token,9);board=(await req(null,a.data.token)).data;assert.equal(board.myDaily.sets,2);assert.equal(board.myDaily.accuracy,80);assert.deepEqual(board.daily.map(p=>p.rank),[1,2]);
const school=(await req(null,a.data.token,'?exam=en&school=polimi')).data;assert.equal(school.dailyTotal,1);
assert.equal((await req(null,null,'?exam=it&school=all')).data.dailyTotal,0);
const c=await req({action:'challenge',examLanguage:'en',questionIds:second},a.data.token);assert.equal((await req({action:'practice',challenge:c.data.challenge,answers:round.answers.slice(0,9)},a.data.token)).status,400);
now=Date.parse('2026-10-05T15:00:00Z');board=(await req(null,a.data.token)).data;assert.equal(board.day,'2026-10-06');assert.equal(board.dailyTotal,0);assert.equal(board.myDaily,null);
await complete(first,a.data.token,10);assert.equal((await req(null,a.data.token)).data.myDaily.sets,1);
const p=[{id:'p',nickname:'P',school:'polimi',examLanguage:'en'}];const old={id:'old',type:'set-receipt',participantId:'p',examLanguage:'en',createdAt:now-86400000,correct:10,answers:first.map(questionId=>({questionId,correct:true}))};assert.equal(aggregateBoard(p,[],[],{now,dailyReceipts:[old]}).dailyTotal,0);
console.log('Daily ranking passed: canonical server score, completed ten-question sets, permutation/replay deduplication, shared ties, language/university scopes, same-day UTC-week rollover, Tokyo midnight reset.');
