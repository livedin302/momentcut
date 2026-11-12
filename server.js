'use strict';
/** MomentCut server: dependency-free static hosting + temporary photo sharing + QR. */
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const { Readable } = require('node:stream');
const QRCode = require('./vendor/QRCode');
const QRErrorCorrectLevel = require('./vendor/QRCode/QRErrorCorrectLevel');
const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC = path.join(__dirname,'public');
const SHARED = process.env.SHARED_DIR || path.join(__dirname,'shared');
const IS_VERCEL = Boolean(process.env.VERCEL);
const USE_BLOB = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
const SHARE_UPLOAD_LIMIT = IS_VERCEL ? 3*1024*1024 : 10*1024*1024;
const EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_IMAGE = 10*1024*1024;
const TYPES = {'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.ico':'image/x-icon','.webp':'image/webp'};
function send(res,status,body,type='text/plain; charset=utf-8',headers={}){
  res.writeHead(status,{'Content-Type':type,'X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer',...headers});res.end(body);
}
const json=(res,code,data)=>send(res,code,JSON.stringify(data),'application/json; charset=utf-8',{'Cache-Control':'no-store'});
async function readJSON(req,limit=14*1024*1024){
  // Vercel may parse JSON before passing the request to our function.
  if(req.body !== undefined && req.body !== null){
    return typeof req.body==='string' ? JSON.parse(req.body) : req.body;
  }
  let size=0,chunks=[];
  for await(const chunk of req){size+=chunk.length;if(size>limit)throw Object.assign(new Error('용량 초과'),{status:413});chunks.push(chunk)}
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
function qrSVG(value){
  let qr=new QRCode(-1,QRErrorCorrectLevel.M);qr.addData(value);qr.make();
  const n=qr.getModuleCount(),quiet=4,total=n+quiet*2;
  let rects=[];
  for(let y=0;y<n;y++){
    let start=-1;
    for(let x=0;x<=n;x++){
      let dark=x<n?qr.isDark(y,x):false;
      if(dark&&start<0)start=x;
      if(!dark&&start>=0){rects.push(`<rect x="${start+quiet}" y="${y+quiet}" width="${x-start}" height="1"/>`);start=-1}
    }
  }
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><g fill="#2b2430">${rects.join('')}</g></svg>`;
}
function validToken(id){return /^[A-Za-z0-9_-]{16,32}$/.test(id)}
async function loadBlobSDK(){ return import('@vercel/blob'); }
async function saveShared(id,png){
  if(USE_BLOB){
    const { put }=await loadBlobSDK();
    await put(`shared/${id}.png`,png,{
      access:'private',addRandomSuffix:false,contentType:'image/png',
    });
  } else {
    if(IS_VERCEL) throw Object.assign(new Error('QR 공유를 사용하려면 Vercel 프로젝트에 Blob 스토리지를 연결해야 해요.'),{status:503});
    await fs.mkdir(SHARED,{recursive:true});
    await fs.writeFile(path.join(SHARED,id+'.png'),png,{flag:'wx'});
  }
}
async function getShared(id){
  if(!validToken(id))return null;
  if(USE_BLOB){
    try{
      const { head, del }=await loadBlobSDK();
      const pathname=`shared/${id}.png`;
      const meta=await head(pathname);
      if(Date.now()-new Date(meta.uploadedAt).getTime()>EXPIRES_MS){
        await del(pathname).catch(()=>{});return null;
      }
      return {type:'blob',pathname};
    }catch{return null}
  }
  if(IS_VERCEL)return null;
  try{
    const file=path.join(SHARED,id+'.png'),stat=await fs.stat(file);
    if(Date.now()-stat.mtimeMs>EXPIRES_MS){await fs.unlink(file).catch(()=>{});return null}
    return {type:'file',file};
  }catch{return null}
}

function sharedPage(id){
  const image='/api/image?id='+encodeURIComponent(id);
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>모먼트컷 공유 사진</title><style>*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo',sans-serif;background:#faf7f3;color:#302934;margin:0;text-align:center;padding:30px 18px}.card{margin:auto;max-width:520px;border-radius:20px;background:white;padding:24px;box-shadow:0 10px 35px #32213c13}h1{font-size:24px;margin:0 0 7px;letter-spacing:-1px}.sub{color:#918896;font-size:13px;margin:0 0 24px}.photo{max-width:100%;max-height:72vh;display:block;margin:auto;box-shadow:0 10px 26px #463c462b}a.btn{display:block;max-width:280px;margin:24px auto 10px;border-radius:12px;padding:15px;background:#302934;color:white;text-decoration:none;font-weight:bold}a.home{color:#9576b9;font-size:12px}small{display:block;color:#9c929b;line-height:1.8;margin:20px auto}</style></head><body><main class="card"><h1>momentcut. ♡</h1><p class="sub">우리의 소중한 순간을 공유해요</p><img class="photo" src="${image}" alt="공유된 네컷 사진"><a class="btn" href="${image}" download="momentcut.png">↓ 사진 다운로드</a><a class="home" href="/">내 네컷도 만들러 가기 ↗</a><small>링크를 아는 사람은 누구나 열 수 있어요.<br>공유 링크는 업로드 7일 후 만료됩니다.</small></main></body></html>`;
}
async function cleanup(){
  const items=await fs.readdir(SHARED,{withFileTypes:true}).catch(()=>[]);
  await Promise.all(items.filter(x=>x.isFile()&&x.name.endsWith('.png')).map(async f=>{
    const p=path.join(SHARED,f.name),stat=await fs.stat(p).catch(()=>null);
    if(stat&&Date.now()-stat.mtimeMs>EXPIRES_MS)await fs.unlink(p).catch(()=>{});
  }));
}
async function handle(req,res){
  const base='http://127.0.0.1';let url;
  try{url=new URL(req.url,base)}catch{return send(res,400,'Bad request')}
  const pathname=url.pathname;
  if(pathname==='/health')return json(res,200,{ok:true,service:'momentcut'});
  if(req.method==='POST'&&pathname==='/api/share'){
    if(!req.headers['content-type']?.startsWith('application/json'))return json(res,415,{error:'JSON 형식이 필요합니다.'});
    try{
      if(IS_VERCEL&&!USE_BLOB)return json(res,503,{error:'QR 공유를 사용하려면 Vercel 프로젝트에 Blob 스토리지를 먼저 연결해야 해요. PNG 다운로드는 그대로 사용할 수 있어요.'});
      const {image}=await readJSON(req,Math.ceil(SHARE_UPLOAD_LIMIT*4/3)+500);
      if(typeof image!=='string'||!image.startsWith('data:image/png;base64,'))return json(res,400,{error:'PNG만 지원합니다.'});
      const b64=image.slice(22);
      if(b64.length>Math.ceil(SHARE_UPLOAD_LIMIT*4/3)+100||!/^[A-Za-z0-9+/]+={0,2}$/.test(b64))return json(res,413,{error:IS_VERCEL?'Vercel 공유용 사진이 너무 커요. (최대 약 3MB)':'이미지가 너무 크거나 형식이 잘못되었습니다.'});
      const png=Buffer.from(b64,'base64');
      if(png.length>SHARE_UPLOAD_LIMIT||png.length<50||png.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')return json(res,400,{error:'올바른 PNG 이미지가 아닙니다.'});
      const id=crypto.randomBytes(15).toString('base64url');
      await saveShared(id,png);
      return json(res,201,{url:'/api/view?id='+id,expiresInDays:7});
    }catch(err){console.error('공유 실패:',err);return json(res,err.status||500,{error:err.status?err.message:'사진 공유 중 서버 오류가 발생했어요.'})}
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,'Method not allowed');
  if(pathname==='/api/qr'){
    const value=url.searchParams.get('text')||'';
    if(!value||value.length>512)return send(res,400,'Invalid QR value');
    try{return send(res,200,qrSVG(value),'image/svg+xml; charset=utf-8',{'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'unsafe-inline'"})}
    catch{return send(res,400,'QR encoding failed')}
  }
  if(pathname==='/api/view'||pathname.startsWith('/s/')){
    const id=pathname==='/api/view'?(url.searchParams.get('id')||''):pathname.slice(3);
    const file=await getShared(id);if(!file)return send(res,404,'이 사진은 없거나 만료되었어요.');
    return send(res,200,sharedPage(id),'text/html; charset=utf-8',{'Cache-Control':'no-store','X-Robots-Tag':'noindex'});
  }
  if(pathname==='/api/image'||pathname.startsWith('/shared/')){
    const id=pathname==='/api/image'?(url.searchParams.get('id')||''):pathname.slice('/shared/'.length).replace(/\.png$/,'');
    if(pathname!=='/api/image'&&pathname!==`/shared/${id}.png`)return send(res,404,'Not found');
    const file=await getShared(id);if(!file)return send(res,404,'Not found');
    if(file.type==='blob'){
      try{
        const { get }=await loadBlobSDK();
        const result=await get(file.pathname,{access:'private'});
        if(!result||result.statusCode!==200)return send(res,404,'Not found');
        if(req.method==='HEAD')return send(res,200,'','image/png',{'Cache-Control':'private, max-age=3600','X-Robots-Tag':'noindex'});
        res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'private, max-age=3600','X-Robots-Tag':'noindex','X-Content-Type-Options':'nosniff'});
        Readable.fromWeb(result.stream).on('error',()=>res.destroy()).pipe(res);
        return;
      }catch(err){console.error('Blob 읽기 실패:',err);return send(res,502,'이미지를 읽을 수 없어요.')}
    }
    const data=await fs.readFile(file.file);return send(res,200,req.method==='HEAD'?'':data,'image/png',{'Cache-Control':'private, max-age=3600','X-Robots-Tag':'noindex'});
  }
  const allowed=new Set(['/','/index.html','/app.js','/style.css','/favicon.svg']);
  if(!allowed.has(pathname))return send(res,404,'Not found');
  const name=pathname==='/'?'index.html':pathname.slice(1);
  try{const data=await fs.readFile(path.join(PUBLIC,name));
    return send(res,200,req.method==='HEAD'?'':data,TYPES[path.extname(name)]||'application/octet-stream',{'Cache-Control':'public, max-age=120'});
  }catch{return send(res,404,'Not found')}
}
async function start(){
  if(!USE_BLOB){await fs.mkdir(SHARED,{recursive:true});await cleanup()}
  if(!IS_VERCEL)setInterval(()=>cleanup().catch(()=>{}),60*60*1000).unref();
  return http.createServer((req,res)=>handle(req,res).catch(err=>{console.error(err);if(!res.headersSent)send(res,500,'Server error')})).listen(PORT,HOST,()=>console.log(`MomentCut running at http://localhost:${PORT}`));
}
if(require.main===module)start().catch(err=>{console.error(err);process.exit(1)});
module.exports={handle,start,qrSVG,sharedPage,validToken,EXPIRES_MS};
