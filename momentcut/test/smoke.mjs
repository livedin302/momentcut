import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {setTimeout as wait} from 'node:timers/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const cwd=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const port=43217;
const base=`http://127.0.0.1:${port}`;

test('홈페이지와 API 기본 경로: 로컬 서버 및 Vercel Functions',async t=>{
  const child=spawn(process.execPath,['server.js'],{cwd,env:{...process.env,PORT:String(port),SHARED_DIR:path.join(cwd,'.test-shared')}});
  t.after(()=>child.kill());
  let ready=false;
  for(let i=0;i<60;i++){
    await wait(60);
    try{if((await fetch(`${base}/health`)).ok){ready=true;break;}}catch{}
  }
  assert.equal(ready,true,'서버 실행 실패');
  for(const [url,expectedType] of [['/','text/html'],['/app.js','javascript'],['/style.css','text/css'],['/favicon.svg','image/svg+xml']]){
    const r=await fetch(`${base}${url}`);
    assert.equal(r.status,200,url);
    assert.ok((r.headers.get('content-type')||'').includes(expectedType),`Content-Type 오류: ${url}`);
  }
  const qr=await fetch(`${base}/api/qr?text=${encodeURIComponent('https://example.com/api/view?id=test')}`);
  assert.equal(qr.status,200);
  assert.match(await qr.text(),/<svg/);
  const samplePNG='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==';
  const upload=await fetch(`${base}/api/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'data:image/png;base64,'+samplePNG})});
  assert.equal(upload.status,201,await upload.text());
  // Separate upload for checking share/read endpoints.
  const uploadAgain=await fetch(`${base}/api/share`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:'data:image/png;base64,'+samplePNG})});
  assert.equal(uploadAgain.status,201);
  const shared=await uploadAgain.json();
  assert.match(shared.url,/^\/api\/view\?id=/);
  const sharePage=await fetch(new URL(shared.url,base));
  assert.equal(sharePage.status,200);
  const imageURL=shared.url.replace('/api/view','/api/image');
  const shareImage=await fetch(new URL(imageURL,base));
  assert.equal(shareImage.status,200);
  assert.equal(shareImage.headers.get('content-type'),'image/png');
  const missing=await fetch(`${base}/api/view?id=notvalid`);
  assert.equal(missing.status,404);
  const {qr:vercelQR,share:vercelShare,view:vercelView,health}=await import('../vercel-api.mjs');
  assert.equal((await health()).status,200);
  const r=vercelQR(new Request('https://example.vercel.app/api/qr?text=hello'));
  assert.equal(r.status,200);
  assert.match(await r.text(),/<svg/);
  const v=await vercelView(new Request('https://example.vercel.app/api/view?id=bad'));
  assert.equal(v.status,404);
  if(!process.env.BLOB_READ_WRITE_TOKEN){
    const noBlob=await vercelShare(new Request('https://example.vercel.app/api/share',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}));
    assert.equal(noBlob.status,503);
  }
});
