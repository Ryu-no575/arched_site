import { getStore } from "@netlify/blobs";

const STORE = "arched-product-metrics";
const KEY = "event-counts";
const ALLOWED = new Set([
  "practice_start_click",
  "set_complete",
  "atlas_open_click",
  "atlas_open",
  "progress_open",
  "upgrade_open",
  "checkout_start"
]);

function res(body,status=200){
  return new Response(JSON.stringify(body),{
    status,
    headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store"}
  });
}

export default async (request) => {
  if(request.method!=="POST") return res({error:"Method not allowed"},405);
  let body={};
  try{body=await request.json()}catch{}
  const event=String(body.event||"");
  if(!ALLOWED.has(event)) return res({error:"Invalid event"},400);

  const store=getStore(STORE);
  for(let attempt=0;attempt<5;attempt++){
    const current=await store.getWithMetadata(KEY,{type:"json",consistency:"strong"});
    const data=current?.data||{events:{},updatedAt:null};
    data.events[event]=(Number(data.events[event])||0)+1;
    data.updatedAt=Date.now();

    let result;
    if(current) result=await store.setJSON(KEY,data,{onlyIfMatch:current.etag});
    else result=await store.setJSON(KEY,data,{onlyIfNew:true});

    if(result.modified) return res({ok:true});
  }
  return res({error:"Busy"},503);
};