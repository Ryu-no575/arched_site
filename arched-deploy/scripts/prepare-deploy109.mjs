import {readdir,readFile,writeFile,stat,mkdir,copyFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {gzipSync} from 'node:zlib';
const root=fileURLToPath(new URL('../',import.meta.url));
const media=join(root,'private/media'), blobRoot=join(root,'.netlify/v1/blobs/deploy/media');
const manifest=JSON.parse(await readFile(join(root,'private/client/manifest.json'),'utf8'));
let bundled=0, mediaBytes=0, mediaCount=0;
const files=['private/manifest.json','private/client/app.html','private/client/bundle.json','private/client/manifest.json'];
for(const [name,count] of Object.entries(manifest)) for(let i=0;i<count;i++) files.push(`private/client/data/${name}-${i}.jsonpart`);
for(const f of await readdir(join(root,'private'))) if(/^script-\d\.js$/.test(f)) files.push('private/'+f);
// Rebuild gzip from committed source. Never deploy stale compressed scripts.
const references=new Set();
for(const f of files){
 const data=await readFile(join(root,f));bundled+=data.length;
 for(const match of data.toString().matchAll(/action=media&(?:amp;)?name=([a-f0-9]{24}\.(?:jpg|png|webp|gif|svg))/g))references.add(match[1]);
 if(f!=='private/manifest.json'){const gz=gzipSync(data,{level:9});await writeFile(join(root,f+'.gz'),gz);bundled+=gz.length;}
}
if(bundled>120*1024*1024)throw Error('Private function assets exceed the 120 MiB project budget. Split data before publishing.');
// Deploy-specific blobs are uploaded by Netlify's Frameworks API and follow rollbacks.
await rm(blobRoot,{recursive:true,force:true});await mkdir(blobRoot,{recursive:true});
for(const name of await readdir(media)){
 if(!/^[a-f0-9]{24}\.(jpg|png|webp|gif|svg)$/.test(name))continue;
 const src=join(media,name),size=(await stat(src)).size;
 if(size>4*1024*1024)throw Error(`Media ${name} exceeds the response-size budget; resize this asset first.`);
 const dest=join(blobRoot,name);await mkdir(dest,{recursive:true});await copyFile(src,join(dest,'blob'));
 mediaBytes+=size;mediaCount++;references.delete(name);
}
if(references.size)throw Error('Missing referenced images: '+[...references].slice(0,10).join(', '));
const report={functionAssetBytes:bundled,mediaBytes,mediaCount,missingReferencedImages:references.size,publicDirectory:'public',mediaDelivery:'authenticated access handler -> deploy-specific private blobs'};
await writeFile(join(root,'deploy-report109.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
