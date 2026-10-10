const accessAPI='/.netlify/functions/access';
const notice=document.getElementById('notice');
const fetchAccess=async(action,body)=>{const r=await fetch(accessAPI+'?action='+action,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:body?{'content-type':'application/json'}:{},body:body?JSON.stringify(body):undefined});const d=await r.json();if(!r.ok)throw Error(d.error||'Request failed.');return d};
let appLoading109=false;
async function loadLibrary109(action,format,signal){
 const r=await fetch(accessAPI+'?action='+action,{cache:'no-store',credentials:'same-origin',signal});
 if(!r.ok)throw Error(r.status===403?'Your session or membership has expired. Sign in again.':'Library loading failed. Please retry.');
 return format==='json'?r.json():r.text();
}
async function openApp(){
 if(appLoading109)return;appLoading109=true;
 document.getElementById('retryLibrary109')?.remove();document.getElementById('login').hidden=true;
 notice.textContent='Loading your library… Please keep this tab open.';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
 try{
  window.MEMBER_DATA=await loadLibrary109('bundle','json',controller.signal);
  notice.textContent='Preparing your study space…';
  await new Promise(resolve=>setTimeout(resolve,0));
  const html=await loadLibrary109('app','text',controller.signal);
  document.open();document.write(html);document.close();
 }catch(e){
  notice.textContent=e.name==='AbortError'?'Loading took too long. Check your connection and retry.':e.message;
  document.getElementById('login').hidden=false;
  const retry=document.createElement('button');retry.id='retryLibrary109';retry.type='button';retry.textContent='Retry loading';retry.onclick=()=>loadAccountStatus58().catch(err=>notice.textContent=err.message);notice.after(retry);
 }finally{clearTimeout(timeout);appLoading109=false;}
}
let mode='login',codeMode=false;
const el=id=>document.getElementById(id);
function setMode(next){mode=next;codeMode=false;el('useCode').textContent='Use an access code';el('heading').textContent=next==='register'?'Create account':'Sign in';el('submit').textContent=el('heading').textContent;el('credential').name='password';el('credential').autocomplete=next==='register'?'new-password':'current-password';el('credential').minLength=next==='register'?12:1;el('credentialText58').textContent='Password';el('useCode').hidden=next==='register';el('credential').value='';el('usernameLabel58').hidden=next!=='register';el('username58').required=next==='register';el('username58').disabled=next!=='register';notice.textContent=next==='register'?'Use at least 12 characters.':''}
el('signInTab').onclick=()=>setMode('login');el('registerTab').onclick=()=>setMode('register');
el('useCode').onclick=()=>{codeMode=!codeMode;el('credential').name=codeMode?'code':'password';el('credentialText58').textContent=codeMode?'Access code':'Password';el('useCode').textContent=codeMode?'Use a password':'Use an access code';el('credential').value=''};
el('login').onsubmit=async e=>{e.preventDefault();const f=new FormData(e.target),button=el('submit'),body=Object.fromEntries(f);body.remember=el('login').elements.remember.checked;button.disabled=true;try{await fetchAccess(mode,body);try{if(body.remember)(window.archedStorage109||localStorage).setItem('arched_login_email',body.email);else (window.archedStorage109||localStorage).removeItem('arched_login_email')}catch{};await loadAccountStatus58()}catch(e){notice.textContent=e.message}finally{button.disabled=false}};
el('logout').onclick=async()=>{await fetchAccess('logout',{});window.clearMemberState58?.();location.replace('/')};
async function billing(action,button){button.disabled=true;notice.textContent='Opening billing…';try{const d=await fetchAccess(action,{});const u=new URL(d.url);if(u.protocol!=='https:'||!['checkout.stripe.com','billing.stripe.com'].includes(u.hostname))throw Error('Invalid billing destination.');location.assign(u.href)}catch(e){notice.textContent=e.message;button.disabled=false}}
el('subscribe').onclick=()=>billing('checkout',el('subscribe'));el('manage').onclick=()=>billing('portal',el('manage'));
async function loadAccountStatus58(){const d=await fetchAccess('status');if(d.active&&d.username&&!d.needsUsername&&!new URLSearchParams(location.search).has('account')){await window.prepareMemberState58(d);await openApp();return d}el('logout').hidden=!d.signedIn;el('account').hidden=!d.signedIn;el('login').hidden=d.signedIn;el('accountTabs').hidden=d.signedIn;el('useCode').hidden=d.signedIn;el('accountEmail').textContent=d.email||'';el('profileUsername58').value=d.username||'';el('profileSchool58').value=d.school||'';el('openLibrary57').hidden=!d.active||d.needsUsername;el('subscribe').hidden=!d.signedIn||!d.billingReady||d.access?.basicPurchase||d.hasSubscription&&['active','trialing','past_due','incomplete','unpaid','paused'].includes(d.billingStatus);el('manage').hidden=!d.signedIn||!d.hasSubscription;el('billingNote').textContent=d.active?'Access until '+new Date(d.paidUntil).toLocaleDateString():d.billingReady?'Renews monthly until cancelled. Access continues through your paid period.':'Subscriptions are not open yet.';window.ACCOUNT59=d;renderOffer59();if(d.signedIn)notice.textContent=d.needsUsername?'Choose your username below. It appears in the rankings.':d.active?'':'Your account is saved. Subscribe when available to open the library.';return d}
try{el('login').elements.email.value=(window.archedStorage109||localStorage).getItem('arched_login_email')||''}catch{}
fetchAccess('config').then(c=>{window.CATALOG59=c.catalog;renderOffer59();if(c.contact){el('contact').href=c.contact;el('contact').hidden=false;el('contact').target='_blank';el('contact').rel='noopener noreferrer'}}).catch(()=>{});
(async()=>{const initial=await loadAccountStatus58();if(initial?.active)return;if(new URLSearchParams(location.search).get('billing')==='success'){notice.textContent='Confirming your payment…';for(let i=0;i<12;i++){await new Promise(r=>setTimeout(r,1500));const d=await loadAccountStatus58();if(d?.active)return}notice.textContent='Payment confirmation is still processing. Refresh shortly.'}})().catch(e=>notice.textContent=e.message);

el('profile58').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{await fetchAccess('profile',Object.fromEntries(new FormData(e.target)));await loadAccountStatus58();notice.textContent='Profile saved.'}catch(e){notice.textContent=e.message}finally{button.disabled=false}};el('username58').disabled=true;

function renderOffer59(){const b=window.CATALOG59?.basic,account=window.ACCOUNT59,button=el('buyBasic59');if(!button)return;const available=!!b?.available;const subscribed=!!account?.hasSubscription&&['active','trialing','past_due','incomplete','unpaid','paused'].includes(account.billingStatus);el('subscribe').hidden=!available||!account?.signedIn||subscribed;button.disabled=!available||subscribed;button.textContent=subscribed?'Subscribed':available?'Subscribe':'Not yet available';if(b?.price)el('basicPrice59').textContent=new Intl.NumberFormat(undefined,{style:'currency',currency:b.price.currency.toUpperCase()}).format(b.price.amount/10**new Intl.NumberFormat(undefined,{style:'currency',currency:b.price.currency.toUpperCase()}).resolvedOptions().maximumFractionDigits)+' / month';button.onclick=()=>{if(account?.signedIn)billing('checkout',button);else{document.querySelector('.account-entry59').open=true;setMode('register');el('username58').focus()}}}
