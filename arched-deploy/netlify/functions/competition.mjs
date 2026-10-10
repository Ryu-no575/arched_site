import { activeMember61 } from '../../server/access.mjs';
import { getStore } from '@netlify/blobs';
import { createCompetitionHandler } from '../../server/competition.mjs';
export default async request=>{
const store=getStore({name:'arched-competition-v1',consistency:'strong'});
const adapter={
 getJSON:key=>store.get(key,{type:'json',consistency:'strong'}),
 putJSON:(key,value,options={})=>store.setJSON(key,value,options),
 async listJSON(prefix){
  const keys=[];
  for await(const page of store.list({prefix,paginate:true}))keys.push(...page.blobs.map(b=>b.key));
  const rows=[];for(let i=0;i<keys.length;i+=30){const batch=await Promise.all(keys.slice(i,i+30).map(key=>store.get(key,{type:'json',consistency:'strong'})));rows.push(...batch.filter(Boolean))}return rows;
 }
};
const members=getStore({name:'arched-members-v49',consistency:'strong'});
const memberAdapter={getJSON:k=>members.get(k,{type:'json',consistency:'strong'}),async listJSON(prefix){const rows=[];for await(const page of members.list({prefix,paginate:true})){for(const b of page.blobs){const row=await members.get(b.key,{type:'json',consistency:'strong'});if(row)rows.push(row)}}return rows}};
return createCompetitionHandler(adapter,{resolveMember:req=>activeMember61(req,memberAdapter)})(request);
};
