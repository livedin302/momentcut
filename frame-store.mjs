/** Shared frame store: local filesystem for development; private Vercel Blob in production. */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
const root=process.env.FRAME_DATA_DIR||path.join(path.dirname(fileURLToPath(import.meta.url)),'data','admin-frames');
const cloud=Boolean(process.env.VERCEL);
const prefix='frame-presets/';
const images='frame-images/';
const validId=id=>typeof id==='string' && /^[0-9a-f-]{36}$/.test(id);
const metaPath=id=>`${prefix}${id}.json`;
const extFor=type=>type==='image/png'?'png':type==='image/webp'?'webp':'jpg';
const headers={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const localMeta=id=>path.join(root,id+'.json');
const localImage=version=>path.join(root,version);
async function sdk(){if(!process.env.BLOB_READ_WRITE_TOKEN)throw Object.assign(new Error('Vercel Blob Private 스토리지를 연결해 주세요.'),{status:503});return import('@vercel/blob');}
async function readCloud(key){const { get }=await sdk();const object=await get(key,{access:'private'});if(!object||object.statusCode!==200)return null;return {data:Buffer.from(await new Response(object.stream).arrayBuffer()),contentType:object.contentType};}
export async function listFrames(){
  if(cloud){
    const { list }=await sdk();const all=[];let cursor;
    do{const page=await list({prefix,limit:100,cursor});for(const entry of page.blobs){if(!entry.pathname.endsWith('.json'))continue;try{const file=await readCloud(entry.pathname);if(file)all.push(JSON.parse(file.data.toString('utf8')))}catch(err){console.error('Frame metadata skipped:',err)}}cursor=page.hasMore?page.cursor:null;}while(cursor&&all.length<100);
    return all.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).slice(0,100);
  }
  await fs.mkdir(root,{recursive:true});const names=(await fs.readdir(root)).filter(x=>x.endsWith('.json'));const items=[];
  for(const n of names){try{items.push(JSON.parse(await fs.readFile(path.join(root,n),'utf8')))}catch{}}
  return items.sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
}
export async function getFrame(id){if(!validId(id))return null;
  if(cloud){try{const file=await readCloud(metaPath(id));return file?JSON.parse(file.data.toString('utf8')):null}catch(e){if(e?.name==='BlobNotFoundError'||e?.status===404)return null;throw e}}
  try{return JSON.parse(await fs.readFile(localMeta(id),'utf8'))}catch(e){if(e.code==='ENOENT')return null;throw e}
}
export async function putFrame(frame,image){
  const old=await getFrame(frame.id);let newKey=null;
  if(image){
    const version=`${frame.id}-${randomUUID()}.${extFor(image.type)}`;
    newKey=cloud?images+version:version;
    if(cloud){const {put}=await sdk();await put(newKey,image.data,{access:'private',contentType:image.type,addRandomSuffix:false});}
    else{await fs.mkdir(root,{recursive:true});await fs.writeFile(localImage(version),image.data,{flag:'wx'});}
    frame.imageKey=newKey;
  }else if(frame.removeOverlay){frame.imageKey=null;}else{frame.imageKey=old?.imageKey||null;}
  delete frame.removeOverlay;
  frame.updatedAt=new Date().toISOString();frame.createdAt=old?.createdAt||frame.updatedAt;
  const json=JSON.stringify(frame);
  try{
    if(cloud){const {put}=await sdk();await put(metaPath(frame.id),json,{access:'private',contentType:'application/json',addRandomSuffix:false,allowOverwrite:true,cacheControlMaxAge:60});}
    else{await fs.mkdir(root,{recursive:true});await fs.writeFile(localMeta(frame.id),json);}
  }catch(e){if(newKey)await deleteImage(newKey).catch(()=>{});throw e}
  if(old?.imageKey && old.imageKey!==frame.imageKey)await deleteImage(old.imageKey).catch(e=>console.error('Old image cleanup error:',e));
  return frame;
}
async function deleteImage(key){if(!key)return;if(cloud){const {del}=await sdk();await del(key)}else await fs.unlink(localImage(path.basename(key))).catch(e=>{if(e.code!=='ENOENT')throw e})}
export async function deleteFrame(id){const old=await getFrame(id);if(!old)return false;
  if(cloud){const {del}=await sdk();await del(metaPath(id));}else await fs.unlink(localMeta(id));
  if(old.imageKey)await deleteImage(old.imageKey).catch(e=>console.error('Frame image deletion error:',e));return true;
}
export async function getFrameImage(id){const meta=await getFrame(id);if(!meta?.imageKey)return null;
  const key=meta.imageKey;
  if(cloud){return await readCloud(key)}
  try{return {data:await fs.readFile(localImage(path.basename(key))),contentType:key.endsWith('.png')?'image/png':key.endsWith('.webp')?'image/webp':'image/jpeg'}}catch{return null}
}
export {validId,headers};
