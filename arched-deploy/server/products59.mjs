export const MOCK_RELEASED59=false;
export async function productAccess59(store,id,member,now=Date.now()){
 if(!member||member.disabled)return {basic:false,mock:false,basicUntil:null,mockUntil:null,basicPurchase:false};
 const rows=await store.listJSON('purchase/'+id+'/');
 const blocks=await Promise.all(rows.map(r=>r.paymentIntentId?store.getJSON('purchase-block/'+r.paymentIntentId):null));
 const valid=rows.filter((r,i)=>!blocks[i]?.blocked);
 const end=product=>Math.max(0,...valid.filter(r=>r.product===product&&r.state==='paid').map(r=>Date.parse(r.accessUntil)||0));
 const purchased=end('basic'),basicEnd=Math.max(purchased,Date.parse(member.paidUntil)||0),mockEnd=end('mock');
 return {basic:basicEnd>now,mock:MOCK_RELEASED59&&basicEnd>now&&mockEnd>now,basicUntil:basicEnd?new Date(basicEnd).toISOString():null,mockUntil:mockEnd?new Date(mockEnd).toISOString():null,basicPurchase:purchased>now};
}
