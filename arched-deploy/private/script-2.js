
/* Community figures come from real API records; no demo players or seeded scores. */
const LEAGUE_STORAGE='archedCompetitionV1',LEAGUE_ENDPOINT='/.netlify/functions/competition';
let leagueSaved={};try{leagueSaved=JSON.parse((window.archedStorage109||localStorage).getItem(LEAGUE_STORAGE)||'{}')}catch{}
const leagueState={profile:leagueSaved.profile||null,token:leagueSaved.token||null,school:leagueSaved.school||'all',progressTab:'rankings',board:null,connected:false,requestNo:0,sessions:leagueSaved.sessions||{},outbox:leagueSaved.outbox||[]};
const leaguePending=new Map();let leagueProfileUpdates=Promise.resolve(),leagueSending=false;
const leagueEscape=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const leagueNumber=x=>Number(x).toLocaleString(undefined,{maximumFractionDigits:2});
function leagueSave(){try{(window.archedStorage109||localStorage).setItem(LEAGUE_STORAGE,JSON.stringify({profile:leagueState.profile,token:leagueState.token,school:leagueState.school,sessions:leagueState.sessions,outbox:leagueState.outbox}))}catch{document.getElementById('leagueStatus').textContent='Your browser could not save this profile.'}}
async function leagueRequest(body=null,query=''){
 const headers={};if(leagueState.token&&leagueState.token!=='account')headers.authorization='Bearer '+leagueState.token;if(body)headers['content-type']='application/json';
 const r=await fetch(LEAGUE_ENDPOINT+query,{method:body?'POST':'GET',headers,body:body?JSON.stringify(body):undefined});let data;try{data=await r.json()}catch{throw new Error('Rankings need the hosted API.')}
 if(!r.ok)throw Object.assign(new Error(data.error||'Rankings are unavailable.'),{status:r.status});return data;
}
function showProgressTab(tab){
 leagueState.progressTab=tab;
 document.getElementById('personalProgressPanel').hidden=tab!=='personal';document.getElementById('leaguePanel').hidden=false;
 document.querySelectorAll('[data-progress-tab]').forEach(b=>b.classList.toggle('active',b.dataset.progressTab===tab));
 if(tab==='rankings')refreshLeagueBoard();
}
function openRankings(){goView('homeView');document.getElementById('leaguePanel').scrollIntoView?.({behavior:'smooth',block:'start'});}
function renderLeagueBoard(){
 const b=leagueState.board,me=leagueState.profile?.id;
 document.getElementById('leagueTrackLabel').textContent=practiceState.examLanguage==='it'?'Italiano':'English';
 document.getElementById('leagueJoin').textContent='Account';document.getElementById('leagueJoin').disabled=!leagueState.connected;
 if(!b){document.getElementById('leaguePracticeEmpty').textContent='Rankings unavailable.';document.getElementById('leagueEnglishCount').textContent='—';document.getElementById('leagueItalianCount').textContent='—';document.getElementById('leaguePracticeRows').innerHTML='';document.getElementById('leaguePracticeEmpty').hidden=false;document.getElementById('leagueYou').hidden=true;return}
 document.getElementById('leaguePracticeEmpty').textContent='No answers yet today.';document.getElementById('leagueEnglishCount').textContent=leagueNumber(b.counts.en);document.getElementById('leagueItalianCount').textContent=leagueNumber(b.counts.it);
 document.getElementById('leaguePracticeRows').innerHTML=b.daily.map(p=>`<tr class="${p.id===me?'is-me ':''}${p.rank<=3?'podium':''}"><td>${p.rank}</td><td title="${leagueEscape(p.nickname)}">${leagueEscape(p.nickname)}</td><td>${p.school==='both'?'Both':p.school==='polimi'?'Polimi':'Polito'}</td><td>${leagueNumber(p.points)}</td><td>${p.accuracy}%</td></tr>`).join('');
 document.getElementById('leaguePracticeEmpty').hidden=!!b.daily.length;
 const you=document.getElementById('leagueYou');you.hidden=!b.myDaily;if(b.myDaily)you.textContent=`#${b.myDaily.rank} · ${leagueNumber(b.myDaily.points)} correct · ${b.myDaily.accuracy}% accuracy`;
}
async function refreshLeagueBoard(){
 const no=++leagueState.requestNo,lang=practiceState.examLanguage,school=leagueState.school;
 document.getElementById('leagueConnection').textContent='Updating…';
 try{
  const b=await leagueRequest(null,`?exam=${lang}&school=${school}`);if(no!==leagueState.requestNo)return;
  if(b.version!==2||!Array.isArray(b.daily)||b.examLanguage!==lang||!b.counts)throw new Error('Rankings need the hosted API.');
  if(b.profile){leagueState.profile=b.profile;leagueState.token='account';leagueSave();}
  leagueState.connected=true;leagueState.board=b;document.getElementById('leagueConnection').textContent='Updated '+new Date(b.updatedAt).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});document.getElementById('leagueStatus').textContent='';
 }catch(e){if(no!==leagueState.requestNo)return;leagueState.connected=false;leagueState.board=null;document.getElementById('leagueConnection').textContent='Offline';document.getElementById('leagueStatus').textContent='Rankings appear when the site API is online.'}
 renderLeagueBoard();
}
function leagueSessionKey(set=practiceState.currentSet){return set?.length===10?practiceState.examLanguage+'-'+(set[0].roundId||pHash(set.map(q=>q.questionId).join('|'))):null}
async function syncCompetitionSet(){
 if(!leagueState.token)return;const set=practiceState.currentSet,key=leagueSessionKey();if(!key||leagueState.sessions[key]||leaguePending.has(key))return;
 const lang=practiceState.examLanguage,ids=set.map(q=>q.questionId);
 const work=leagueRequest({action:'challenge',examLanguage:lang,questionIds:ids}).then(data=>{leagueState.sessions[key]=data.challenge;leagueSave()}).catch(()=>{}).finally(()=>leaguePending.delete(key));leaguePending.set(key,work);await work;
}
async function recordCompetitionAnswer62(q){
 if(!leagueState.token||!q.submitted)return;
 const key=leagueSessionKey();if(!key)return;
 const answer={questionId:q.questionId,answer:q.options[q.selected]};
 await syncCompetitionSet();if(leaguePending.has(key))await leaguePending.get(key);
 const challenge=leagueState.sessions[key];if(!challenge)return;
 if(!leagueState.outbox.some(x=>x.action==='answer'&&x.challenge===challenge&&x.questionId===answer.questionId)){
  leagueState.outbox.push({action:'answer',challenge,...answer});leagueSave();
 }
 await flushCompetitionResults();
}
async function recordCompetitionSet(){
 if(!leagueState.token)return;const key=leagueSessionKey(),set=practiceState.currentSet;if(!key||!set?.every(q=>q.submitted))return;
 if(leaguePending.has(key))await leaguePending.get(key);
 const challenge=leagueState.sessions[key];if(!challenge)return;
 const payload={action:'practice',challenge,answers:set.map(q=>({questionId:q.questionId,answer:q.options[q.selected]}))};
 if(!leagueState.outbox.some(x=>x.action==='practice'&&x.challenge===challenge)){leagueState.outbox.push(payload);leagueSave()}
 await flushCompetitionResults();
}
async function flushCompetitionResults(){
 if(leagueSending||!leagueState.token)return;leagueSending=true;
 try{while(leagueState.outbox.length){try{await leagueRequest(leagueState.outbox[0]);leagueState.outbox.shift();leagueSave()}catch(e){if(e.status&&e.status<500){leagueState.outbox.shift();leagueSave();document.getElementById('leagueStatus').textContent='A ranking session expired. Local practice progress is saved.';continue}break}}}finally{leagueSending=false}
 if(leagueState.progressTab==='rankings')await refreshLeagueBoard();
}
function updateCompetitionLanguage(){
 if(!leagueState.profile){renderLeagueBoard();if(leagueState.progressTab==='rankings')refreshLeagueBoard();return}
 const lang=practiceState.examLanguage;leagueState.profile={...leagueState.profile,examLanguage:lang};leagueSave();
 const profile={...leagueState.profile};leagueProfileUpdates=leagueProfileUpdates.catch(()=>{}).then(()=>leagueRequest({action:'profile',...profile})).catch(()=>{}).finally(()=>{if(leagueState.progressTab==='rankings')refreshLeagueBoard()});
 syncCompetitionSet();
}
function openLeagueProfile(){document.getElementById('accountButton57')?.click()}
document.getElementById('leagueProfileForm').addEventListener('submit',async e=>{
 e.preventDefault();const btn=document.getElementById('leagueJoinSubmit');btn.disabled=true;
 try{const b={action:leagueState.token?'profile':'join',nickname:document.getElementById('leagueNickname').value,school:document.getElementById('leagueSchool').value,examLanguage:practiceState.examLanguage};const r=await leagueRequest(b);leagueState.profile=r.profile;if(r.token)leagueState.token=r.token;leagueSave();document.getElementById('leagueProfileDialog').close();await syncCompetitionSet();await refreshLeagueBoard()}
 catch(e){document.getElementById('leagueProfileError').textContent=e.message}finally{btn.disabled=false}
});
document.getElementById('leagueJoin').addEventListener('click',openLeagueProfile);
document.getElementById('leagueRefresh').addEventListener('click',refreshLeagueBoard);
document.getElementById('homeRankings').addEventListener('click',openRankings);
document.querySelectorAll('[data-progress-tab]').forEach(b=>b.addEventListener('click',()=>showProgressTab(b.dataset.progressTab)));
document.querySelectorAll('[data-close-league]').forEach(b=>b.addEventListener('click',()=>document.getElementById(b.dataset.closeLeague).close()));
document.getElementById('leagueSchoolFilter').value=leagueState.school;
document.getElementById('leagueSchoolFilter').addEventListener('change',e=>{leagueState.school=e.target.value;leagueSave();refreshLeagueBoard()});
setInterval(()=>{if(document.getElementById('homeView').classList.contains('active'))refreshLeagueBoard()},30000);
window.addEventListener('online',()=>{flushCompetitionResults();if(leagueState.progressTab==='rankings')refreshLeagueBoard()});
renderLeagueBoard();refreshLeagueBoard().then(()=>{syncCompetitionSet();flushCompetitionResults()});

