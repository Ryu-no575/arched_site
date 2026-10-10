
window.addEventListener('DOMContentLoaded',()=>{
 if(practiceState.playMode==='pictures'&&practiceState.currentSet?.some(q=>!isPaintingFact46(mixedPracticeMap.get(q.questionId)))){
  practiceState.parkedRounds[practiceState.examLanguage+'|mixed']={...practiceSessionSnapshot(),playMode:'mixed'};
  practiceState.currentSet=null;practiceState.index=0;createPracticeSet();
 }
 refreshDueReviews46();refreshProductHome();document.getElementById('leaguePanel').hidden=false;
});
setInterval(()=>{if(document.visibilityState!=='hidden'){refreshDueReviews46();refreshProductHome();}},60000);
window.addEventListener('focus',()=>{refreshDueReviews46();refreshProductHome();});
