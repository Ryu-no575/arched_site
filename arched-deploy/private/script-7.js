/* V102: one exact-subject index joins learning views and Practice. */
const learningData102=window.MEMBER_DATA.LEARNING_LINKS102||{entities:[],byQuestion:{},byTapestry:{},byMuseum:{},byMap:{},buildingPhotosByQuestion:{}};
const learningEntities102=new Map(learningData102.entities.map(e=>[e.id,e]));
function learningIds102(view,id){return view==='question'?learningData102.byQuestion[id]||[]:learningData102[({museum:'byMuseum',tapestry:'byTapestry',map:'byMap'})[view]]?.[id]||[]}
function learningQuestions102(ids){const all=[...new Set(ids.flatMap(id=>learningEntities102.get(id)?.questionIds||[]))];return all.map(id=>mixedPracticeMap.get(id)).filter(f=>f&&eligiblePracticeFact(f,practiceState.examLanguage))}
function learningLinks102(view,id){const ids=learningIds102(view,id);if(!ids.length)return '';const questions=learningQuestions102(ids);const links=[];
 if(questions.length)links.push(`<button onclick="startLinkedPractice102('${view}','${id}',this)">Practice · ${questions.length}</button>`);
 for(const eid of ids){const e=learningEntities102.get(eid);if(!e)continue;
  if(view!=='tapestry'&&e.tapestryIds?.length)links.push(`<button title="${html44(e.title)}" onclick="goLearning102('tapestry','${e.tapestryIds[0]}')">Timeline${ids.length>1?' · '+html44(e.title):''} ↗</button>`);
  if(view!=='museum'&&e.museumIds?.length)links.push(`<button title="${html44(e.title)}" onclick="goLearning102('museum','${e.museumIds[0]}')">Museum${ids.length>1?' · '+html44(e.title):''} ↗</button>`);
  if(view!=='map'&&e.placeId)links.push(`<button title="${html44(e.title)}" onclick="goLearning102('map','${e.placeId}')">Map${ids.length>1?' · '+html44(e.title):''} ↗</button>`);
 }
 return links.length?'<div class="learning-links102">'+[...new Set(links)].join('')+'</div>':'';
}
window.learningLinks102=learningLinks102;
function learningPracticeButton102(view,id){const ids=learningIds102(view,id),questions=learningQuestions102(ids);return questions.length?`<button onclick="startLinkedPractice102('${view}','${id}',this)">Practice · ${questions.length}</button>`:''}
window.learningPracticeButton102=learningPracticeButton102;
function startLinkedPractice102(view,id,button){const ids=learningIds102(view,id);migrateExposures73();const related=learningQuestions102(ids).filter(f=>repeatAllowed73(f));
 const oldMode=practiceState.playMode;practiceState.playMode='mixed';const picks=[],pickedKeys=new Set(),pickedNodes=new Set();
 for(const f of pShuffle(related,pRng(practiceState.shuffleSeed+'|linked102|'+id+'|'+practiceState.setNo))){const seen=practiceState.usedHashes.has(practiceSignature(f));if(seen&&!reviewDue(f.pdfNodeId||f.id))continue;const keys=repetitionKeys95(f),nodeIds=f.relatedNodeIds||[f.pdfNodeId||f.id];if(keys.some(k=>pickedKeys.has(k))||nodeIds.some(k=>pickedNodes.has(k)))continue;picks.push({...f,practiceIsReview:seen});keys.forEach(k=>pickedKeys.add(k));nodeIds.forEach(k=>pickedNodes.add(k));if(picks.length===10)break;}
 if(!picks.length){practiceState.playMode=oldMode;if(button){button.textContent='No fresh or due questions yet';button.setAttribute('aria-live','polite')}return false}
 const selected=new Set(picks.map(f=>f.id)),concepts=new Set(picks.flatMap(f=>repetitionKeys95(f))),nodesUsed=new Set(picks.flatMap(f=>f.relatedNodeIds||[f.pdfNodeId||f.id]));
 const rest=picks.length===10?[]:nextPracticeFacts(practicePool('General Knowledge').filter(f=>!selected.has(f.id)&&!repetitionKeys95(f).some(k=>concepts.has(k))&&!(f.relatedNodeIds||[f.pdfNodeId||f.id]).some(n=>nodesUsed.has(n))),10-picks.length);
 if(picks.length+rest.length!==10){practiceState.playMode=oldMode;if(button)button.textContent='A full set is not available yet';return false}
 quizLaunching57=true;
 try{practiceState.parkedRounds={};practiceState.pendingSets={};practiceState.section='General Knowledge';practiceState.setNo++;practiceState.index=0;practiceState.setStartedAt=Date.now();practiceState.currentSet=[...picks,...rest].map(f=>buildPracticeQuestion(f,!!f.practiceIsReview));for(const f of [...picks,...rest])stampExposure73(f,Date.now());document.getElementById('roundCollection').innerHTML='';savePractice();refreshPlay44();goView('practiceView');document.getElementById('practiceLobby57').hidden=true;document.getElementById('practiceSession57').hidden=false;renderPractice();return true}finally{quizLaunching57=false}
}
function goLearning102(view,id){if(view==='map'){openMap52();selectMapPlace51(id)}else if(view==='tapestry'){goView('tapestryView');window.Tapestry63.init();window.Tapestry63.locate(id);window.Tapestry63.openRecord(id)}else if(view==='museum'){goView('museumView');initializeMuseum46();const entity=learningEntities102.get(learningIds102('museum',id)[0]);document.getElementById('museumSearch45').value=entity?.title||'';for(const key of ['museumSelect45','museumArtist50','museumPriority45']){const el=document.getElementById(key);if(el)el.value=''}renderMuseum45();openMuseumImage61(id)}}
function learningFigures102(q){const ids=learningData102.buildingPhotosByQuestion[q.questionId]||[];if(!ids.length)return '';const source=sourceItem92(mixedPracticeMap.get(q.questionId));if(q.visual&&source?.imageDependency==='essential')return '';const normalized=' '+pNorm(q.stem)+' ';const figures=[];
 for(const id of ids){const e=learningEntities102.get(id),p=e?.photos?.[0];if(!p?.src)continue;if(q.imageId&&e.assetIds?.includes(q.imageId))continue;
  // Use only the name already printed in the question; never reveal an option or its city.
  const alias=normalized.includes(' '+pNorm(e.title)+' ')?e.title:e.aliases.filter(a=>normalized.includes(' '+pNorm(a)+' ')).sort((a,b)=>b.length-a.length)[0];if(!alias)continue;
  figures.push(`<figure><button onclick="openLearningPhoto102('${id}')" aria-label="Enlarge photograph"><img src="${html44(window.PRACTICE_BUILDING_IMAGES103?.[p.src]||p.src)}" alt="${html44(alias)}" decoding="async" onerror="this.hidden=true;this.closest('figure').querySelector('.learning-image-error102').hidden=false"></button><figcaption>${html44(alias)}</figcaption><p class="learning-image-error102" hidden>Photo unavailable. Open the source.</p><details><summary>Photo credit</summary>${html44(p.credit||'')} · ${html44(p.license||'See source')} <a href="${html44(p.sourceUrl||e.reference)}" target="_blank" rel="noopener">Source ↗</a></details></figure>`)
 }
 return figures.length?'<div class="learning-gallery102">'+figures.join('')+'</div>':'';
}
window.learningFigures102=learningFigures102;
function openLearningPhoto102(id){const e=learningEntities102.get(id),p=e?.photos?.[0];if(!p)return;let d=document.getElementById('learningPhoto102');if(!d){d=document.createElement('dialog');d.id='learningPhoto102';d.className='learning-photo102';d.innerHTML='<header><strong>Photograph</strong><button aria-label="Close photograph">×</button></header><img alt="Question photograph"><p></p>';d.querySelector('button').onclick=()=>d.close();d.addEventListener('click',event=>{if(event.target===d)d.close()});document.body.appendChild(d)}d.querySelector('img').src=window.PRACTICE_BUILDING_IMAGES103?.[p.src]||p.src;d.querySelector('p').textContent=[p.credit,p.license].filter(Boolean).join(' · ');d.showModal()}

/* V107: learner-visible evidence of progress, scoped to the actual eligible bank. */
let studyPool107=null,studyLanguage107='';
function studySnapshot107(){
 if(!studyPool107||studyLanguage107!==practiceState.examLanguage){studyLanguage107=practiceState.examLanguage;const pool=practicePool('General Knowledge'),unique=new Map();for(const f of pool){const id=f.pdfNodeId||f.id,n=nodeMap.get(id);if(n?.kind==='fact'&&!unique.has(id))unique.set(id,{id,major:f.major||n.major||'Other'});}studyPool107={questions:pool.length,points:[...unique.values()]};}
 const result={questions:studyPool107.questions,total:studyPool107.points.length,correct:0,incorrect:0,untried:0,due:0,fields:{}};
 for(const n of studyPool107.points){const r=practiceState.reviews[n.id],status=r?.lastResult==='correct'?'correct':r?.lastResult==='incorrect'?'incorrect':'untried';result[status]++;const field=result.fields[n.major]||={total:0,correct:0,incorrect:0,untried:0};field.total++;field[status]++;if(reviewDue(n.id))result.due++;}
 return result;
}
function unfinishedPractice107(){const set=practiceState.currentSet;return Array.isArray(set)&&set.length>0&&set.length<=10&&set.some(q=>!q.submitted)&&set.some(q=>q.submitted||q.selected!=null)&&set.every(q=>!q.examLanguage||q.examLanguage===practiceState.examLanguage);}
function resumePractice107(){if(!unfinishedPractice107())return false;const previous=quizLaunching57;quizLaunching57=true;try{practiceState.index=Math.max(0,practiceState.currentSet.findIndex(q=>!q.submitted));goView('practiceView');document.getElementById('practiceLobby57').hidden=true;document.getElementById('practiceSession57').hidden=false;renderPractice();savePractice();return true;}finally{quizLaunching57=previous;}}
function refreshStudyCheck107(){
 const current=unfinishedPractice107(),done=(practiceState.currentSet||[]).filter(q=>q.submitted).length;
 for(const id of ['homeResume107','practiceResume107']){const el=document.getElementById(id);if(el){el.hidden=!current;el.textContent='Continue your round · '+done+' / '+(practiceState.currentSet?.length||10)+' answered →';}}
 const el=document.getElementById('studyCheck107');if(!el)return;const s=studySnapshot107();
 el.innerHTML=[['Available questions',s.questions],['Practice knowledge points',s.total],['Last recall correct',s.correct],['Last recall incorrect',s.incorrect],['Not yet practised',s.untried],['Due for review',s.due]].map(([label,n])=>'<div class="study-row107"><span>'+label+'</span><strong>'+n.toLocaleString()+'</strong></div>').join('')+'<table><caption>Knowledge points by field</caption><thead><tr><th scope="col">Field</th><th scope="col">Correct</th><th scope="col">Incorrect</th><th scope="col">Untried</th></tr></thead><tbody>'+Object.entries(s.fields).sort((a,b)=>b[1].incorrect-a[1].incorrect||b[1].untried-a[1].untried).map(([name,f])=>'<tr><th scope="row">'+html44(name)+'</th><td>'+f.correct+'</td><td>'+f.incorrect+'</td><td>'+f.untried+'</td></tr>').join('')+'</tbody></table>'+(s.due?'<button class="qbtn" onclick="startDueReview46()">Review '+s.due+' due points →</button>':'<p>No review is due yet. Continue new questions; previous mistakes return after the review interval.</p>');
 renderHomeAtlasProgress();
}
window.studySnapshot107=studySnapshot107;window.refreshStudyCheck107=refreshStudyCheck107;
refreshStudyCheck107();
