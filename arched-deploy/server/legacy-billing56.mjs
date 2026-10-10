import {createHmac,timingSafeEqual} from 'node:crypto';
export function createBilling(store,env=process.env,now=()=>Date.now(),transport=fetch){
 const ready=()=>!!(env.STRIPE_SECRET_KEY&&env.STRIPE_MONTHLY_PRICE_ID&&env.STRIPE_WEBHOOK_SECRET&&env.ARCHED_PUBLIC_URL);
 const base=()=>{const u=new URL(env.ARCHED_PUBLIC_URL);if(u.protocol!=='https:'&&u.hostname!=='localhost'&&u.hostname!=='127.0.0.1')throw Error('Use HTTPS for the public site URL.');return u.origin};
 async function api(path,method='GET',params={},key){const response=await transport('https://api.stripe.com/v1/'+path,{method,headers:{authorization:'Bearer '+env.STRIPE_SECRET_KEY,...(method==='POST'?{'content-type':'application/x-www-form-urlencoded'}:{}),...(key?{'idempotency-key':key}:{})},body:method==='POST'?new URLSearchParams(params):undefined,signal:AbortSignal.timeout(15000)});const data=await response.json();if(!response.ok)throw Error('Billing service is temporarily unavailable.');return data}
 function id(v){return typeof v==='string'?v:v?.id}
 async function refresh(memberId,subscriptionId){if(!/^sub_[A-Za-z0-9]+$/.test(subscriptionId))throw Error('Invalid subscription.');const sub=await api('subscriptions/'+subscriptionId),member=await store.getJSON('member/'+memberId);if(!member||member.disabled)return;
  if(sub.metadata?.memberId!==memberId||id(sub.customer)!==member.stripeCustomerId)throw Error('Subscription account mismatch.');
  const items=sub.items?.data||[],ourItem=items.find(i=>id(i.price)===env.STRIPE_MONTHLY_PRICE_ID);if(!ourItem)throw Error('Subscription price mismatch.');
  const end=ourItem.current_period_end||sub.current_period_end||0,paid=['active','trialing'].includes(sub.status),paidUntil=paid&&end>now()/1000?new Date(end*1000).toISOString():new Date(0).toISOString();
  await store.putJSON('member/'+memberId,{...member,stripeSubscriptionId:sub.id,billingStatus:sub.status,cancelAtPeriodEnd:!!sub.cancel_at_period_end,paidUntil,updatedAt:new Date(now()).toISOString()});return sub
 }
 async function checkout(session){if(!ready())return{error:'Monthly billing has not been configured yet.',status:503};const member=await store.getJSON('member/'+session.id);if(member.stripeSubscriptionId){const sub=await refresh(session.id,member.stripeSubscriptionId);if(sub&&['active','trialing','past_due','incomplete','unpaid','paused'].includes(sub.status))return{error:'You already have a subscription. Use Manage subscription.',status:409}}
  const price=await api('prices/'+encodeURIComponent(env.STRIPE_MONTHLY_PRICE_ID));if(!price.active||price.recurring?.interval!=='month'||price.recurring?.interval_count!==1||!Number.isInteger(price.unit_amount)||price.unit_amount<=0||!price.currency)throw Error('The configured price must be monthly.');
  let customer=member.stripeCustomerId;if(!customer){const c=await api('customers','POST',{email:member.email,'metadata[memberId]':session.id},'arched-customer-'+session.id);customer=c.id;await store.putJSON('member/'+session.id,{...member,stripeCustomerId:customer})}
  await store.putJSON('billing-customer/'+customer,{memberId:session.id});
  const prior=await store.getJSON('billing-checkout/'+session.id);if(prior&&prior.expires>now()){const cs=await api('checkout/sessions/'+prior.id);if(cs.status==='open'&&cs.url)return{url:cs.url}}
  const cs=await api('checkout/sessions','POST',{mode:'subscription',customer,client_reference_id:session.id,'metadata[memberId]':session.id,'subscription_data[metadata][memberId]':session.id,'line_items[0][price]':env.STRIPE_MONTHLY_PRICE_ID,'line_items[0][quantity]':'1',success_url:base()+'/?billing=success',cancel_url:base()+'/?billing=cancelled',locale:'auto'},'arched-checkout-'+session.id+'-'+Math.floor(now()/60000));
  await store.putJSON('billing-checkout/'+session.id,{id:cs.id,expires:cs.expires_at*1000});return{url:cs.url}
 }
 async function portal(session){if(!ready())return{error:'Monthly billing has not been configured yet.',status:503};const member=await store.getJSON('member/'+session.id);if(!member.stripeCustomerId)return{error:'No subscription is linked to this account yet.',status:404};const p=await api('billing_portal/sessions','POST',{customer:member.stripeCustomerId,return_url:base()+'/'});return{url:p.url}}
 async function webhook(req){if(!ready())return new Response('Billing not configured',{status:503});const raw=await req.text();if(raw.length>1000000)return new Response('Too large',{status:413});const parts=(req.headers.get('stripe-signature')||'').split(','),time=parts.find(p=>p.startsWith('t='))?.slice(2),sigs=parts.filter(p=>p.startsWith('v1=')).map(p=>p.slice(3));const mac=createHmac('sha256',env.STRIPE_WEBHOOK_SECRET).update(time+'.'+raw).digest('hex');if(!/^\d+$/.test(time||'')||Math.abs(now()/1000-Number(time))>300||!sigs.some(s=>/^[a-f0-9]{64}$/.test(s)&&timingSafeEqual(Buffer.from(s),Buffer.from(mac))))return new Response('Invalid signature',{status:400});
  let event;try{event=JSON.parse(raw)}catch{return new Response('Invalid body',{status:400})}if(!/^evt_[A-Za-z0-9]+$/.test(event.id||''))return new Response('Invalid event',{status:400});if(await store.getJSON('billing-event/'+event.id))return Response.json({received:true});
  try{const obj=event.data?.object;let subscriptionId,memberId;
   if(['checkout.session.completed','checkout.session.async_payment_succeeded'].includes(event.type)){const cs=await api('checkout/sessions/'+obj.id);if(cs.mode==='subscription'&&cs.status==='complete'){memberId=cs.client_reference_id;const member=await store.getJSON('member/'+memberId);if(!member||member.stripeCustomerId!==id(cs.customer))throw Error('Checkout account mismatch.');subscriptionId=id(cs.subscription)}}
   else if(event.type.startsWith('customer.subscription.')){subscriptionId=obj.id;memberId=(await store.getJSON('billing-customer/'+id(obj.customer)))?.memberId}
   else if(['invoice.paid','invoice.payment_failed','invoice.payment_action_required'].includes(event.type)){subscriptionId=id(obj.subscription)||id(obj.parent?.subscription_details?.subscription);memberId=(await store.getJSON('billing-customer/'+id(obj.customer)))?.memberId}
   if(memberId&&subscriptionId)await refresh(memberId,subscriptionId);
   await store.putJSON('billing-event/'+event.id,{processedAt:new Date(now()).toISOString()});return Response.json({received:true});
  }catch{return new Response('Billing event could not be processed. Retry required.',{status:500})}
 }
 return{ready,checkout,portal,webhook};
}
