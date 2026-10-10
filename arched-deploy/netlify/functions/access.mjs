import {getStore,getDeployStore} from '@netlify/blobs';
import {createAccessHandler} from '../../server/access.mjs';
export default async request=>{
 const s=getStore({name:'arched-members-v49',consistency:'strong'});
 const store={getJSON:k=>s.get(k,{type:'json',consistency:'strong'}),putJSON:async(k,v,options={})=>{const r=await s.setJSON(k,v,options.onlyIfNew?{onlyIfNew:true}:{});return r},async listJSON(prefix){const keys=[];for await(const p of s.list({prefix,paginate:true}))keys.push(...p.blobs.map(x=>x.key));return Promise.all(keys.map(k=>s.get(k,{type:'json',consistency:'strong'})))}};
 return createAccessHandler(store,process.env,()=>Date.now(),fetch,{
  readMedia:name=>getDeployStore().get('media/'+name,{type:'arrayBuffer'})
 })(request);
};
