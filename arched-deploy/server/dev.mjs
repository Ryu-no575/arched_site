import http from 'node:http';
import { readFile, readdir, mkdir, writeFile, rename } from 'node:fs/promises';
import { join, dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { createAccessHandler, isActiveMember, activeMember61 } from './access.mjs';
import { createCompetitionHandler } from './competition.mjs';
const root=dirname(dirname(fileURLToPath(import.meta.url))),data=process.env.ARCHED_DATA_DIR||join(root,'data/community-local');
await mkdir(data,{recursive:true});
const adapter={
 async getJSON(key){try{return JSON.parse(await readFile(join(data,encodeURIComponent(key)+'.json'),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}},
 async putJSON(key,value,{onlyIfNew=false}={}){const path=join(data,encodeURIComponent(key)+'.json');if(onlyIfNew){try{await writeFile(path,JSON.stringify(value),{flag:'wx'});return{modified:true}}catch(e){if(e.code==='EEXIST')return{modified:false};throw e}}const temp=path+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(value));await rename(temp,path);return{modified:true}},
 async listJSON(prefix){const keys=(await readdir(data)).filter(n=>n.endsWith('.json')).map(n=>decodeURIComponent(n.slice(0,-5))).filter(k=>k.startsWith(prefix));return Promise.all(keys.map(k=>this.getJSON(k)))}
};
const handle=createCompetitionHandler(adapter,{resolveMember:req=>activeMember61(req,adapter)}),access=createAccessHandler(adapter),live=new Map();
const server=http.createServer(async(req,res)=>{
 try{
  const base='http://'+req.headers.host,url=new URL(req.url,base);const chunks=[];let bytes=0;for await(const c of req){bytes+=c.length;if(bytes>(url.searchParams.get('action')==='study'?2000000:url.searchParams.get('action')==='stripe-webhook'?1000000:20000)){res.writeHead(413).end();return}chunks.push(c)}const body=Buffer.concat(chunks);
  if(url.pathname==='/.netlify/functions/access'){const response=await access(new Request(url,{method:req.method,headers:{...req.headers,'x-nf-client-connection-ip':req.socket.remoteAddress,'x-local-client-ip':req.socket.remoteAddress},body:['GET','HEAD'].includes(req.method)?undefined:body}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;}
  if(url.pathname==='/.netlify/functions/competition'){
   if(!await isActiveMember(new Request(url,{headers:req.headers}),adapter)){res.writeHead(403,{'content-type':'application/json','cache-control':'no-store'}).end('{"error":"An active membership is required."}');return;}
   const response=await handle(new Request(url,{method:req.method,headers:req.headers,body:['GET','HEAD'].includes(req.method)?undefined:body}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
  }
  if(url.pathname==='/.netlify/functions/live'){const now=Date.now();if(req.method==='POST'){const b=JSON.parse(body||'{}');if(typeof b.id==='string')live.set(b.id,now)}for(const [id,t]of live)if(now-t>90000)live.delete(id);res.writeHead(200,{'content-type':'application/json'}).end(JSON.stringify({active:live.size}));return}
  if(url.pathname==='/.netlify/functions/track'&&req.method==='POST'){await adapter.putJSON('metrics/'+randomUUID(),{time:Date.now(),body:JSON.parse(body.toString())},{onlyIfNew:true});res.writeHead(200,{'content-type':'application/json'}).end('{"ok":true}');return}
  if(req.method!=='GET'){res.writeHead(405).end();return}
  const publicRoot=resolve(root,'public'),path=resolve(publicRoot,'.'+(url.pathname==='/'?'/index.html':decodeURIComponent(url.pathname)));if(path!==publicRoot&&!path.startsWith(publicRoot+'/')){res.writeHead(403).end();return}
  const type={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json'}[extname(path)]||'application/octet-stream';const bytesFile=await readFile(path);res.writeHead(200,{'content-type':type});res.end(bytesFile);
 }catch(e){res.writeHead(e.code==='ENOENT'?404:500,{'content-type':'application/json'}).end(JSON.stringify({error:'Request failed.'}))}
});
const port=Number(process.env.PORT||8765);server.listen(port,'0.0.0.0',()=>console.log(`ARCHED Mastery with rankings: http://localhost:${port}`));
