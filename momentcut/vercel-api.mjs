/**
 * Vercel serverless API (Web-standard Request/Response functions).
 * No rewrites: endpoints are /api/share, /api/qr, /api/view, /api/image.
 * Local node server provides the same routes via server.js.
 */
import { randomBytes } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { qrSVG, sharedPage, validToken, EXPIRES_MS } = require('./server.js');
const STORE_PREFIX = 'shared/';
const MAX_PNG_BYTES = 3 * 1024 * 1024;
const MAX_BODY_CHARS = Math.ceil(MAX_PNG_BYTES * 4 / 3) + 500;

function noStore(extra = {}) { return { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra }; }
function json(value,status=200) { return Response.json(value,{status,headers:noStore()}); }
function error(message,status=400) { return json({error:message},status); }
function idFrom(request) { return new URL(request.url).searchParams.get('id') || ''; }
const pathname = id => `${STORE_PREFIX}${id}.png`;

async function getValidRecord(id) {
  if(!validToken(id)) return null;
  if(!process.env.BLOB_READ_WRITE_TOKEN) return null;
  const { head, del } = await import('@vercel/blob');
  try {
    const record = await head(pathname(id));
    if(Date.now() - new Date(record.uploadedAt).getTime() > EXPIRES_MS) {
      await del(pathname(id)).catch(e => console.error('만료된 공유 사진 삭제 실패:', e));
      return null;
    }
    return record;
  } catch (e) {
    // A missing ID is not an application error.
    if(e?.name === 'BlobNotFoundError' || e?.status === 404) return null;
    throw e;
  }
}

export async function share(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) return error('JSON 형식이 필요합니다.',415);
  if(!process.env.BLOB_READ_WRITE_TOKEN) return error('공유 링크를 만들려면 Vercel Storage에서 Private Blob 저장소를 연결해야 해요. PNG 저장은 그대로 가능해요.',503);
  const statedLength = Number(request.headers.get('content-length') || 0);
  if(statedLength > MAX_BODY_CHARS) return error('사진 파일이 너무 커요. PNG를 3MB 이하로 만들어 주세요.',413);
  let body;
  try { body = await request.text(); }
  catch { return error('사진 데이터를 읽을 수 없어요.'); }
  if(body.length > MAX_BODY_CHARS) return error('사진 파일이 너무 커요. PNG를 3MB 이하로 만들어 주세요.',413);
  let parsed;
  try { parsed = JSON.parse(body); }
  catch { return error('JSON 내용이 올바르지 않아요.'); }
  const image = parsed?.image;
  if(typeof image !== 'string' || !image.startsWith('data:image/png;base64,')) return error('PNG 이미지가 필요해요.');
  const b64 = image.slice('data:image/png;base64,'.length);
  if(b64.length > Math.ceil(MAX_PNG_BYTES * 4/3)+4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return error('이미지 형식이나 크기를 확인해 주세요.',413);
  const png = Buffer.from(b64,'base64');
  if(png.length < 50 || png.length > MAX_PNG_BYTES || png.subarray(0,8).toString('hex') !== '89504e470d0a1a0a') return error('유효한 3MB 이하 PNG만 공유할 수 있어요.');
  const id = randomBytes(15).toString('base64url');
  try {
    const { put } = await import('@vercel/blob');
    await put(pathname(id), new Blob([png], {type:'image/png'}), { access: 'private', addRandomSuffix: false, contentType:'image/png' });
    return json({url:`/api/view?id=${id}`,expiresInDays:7},201);
  } catch(e) {
    console.error('Vercel Blob 저장 실패:',e);
    return error('사진 공유 저장에 실패했어요. Blob 연결과 서버 로그를 확인해 주세요.',502);
  }
}

export function qr(request) {
  const text = new URL(request.url).searchParams.get('text') || '';
  if(!text || text.length > 512) return new Response('Invalid QR value',{status:400,headers:noStore()});
  try { return new Response(qrSVG(text),{status:200,headers:noStore({'Content-Type':'image/svg+xml; charset=utf-8','Content-Security-Policy':"default-src 'none'"})}); }
  catch { return new Response('QR encoding failed',{status:400,headers:noStore()}); }
}

export async function view(request) {
  const id = idFrom(request);
  if(!validToken(id)) return new Response('잘못된 공유 링크예요.',{status:404,headers:noStore()});
  try {
    if(!(await getValidRecord(id))) return new Response('공유 사진이 없거나 링크가 만료됐어요.',{status:404,headers:noStore()});
    return new Response(sharedPage(id),{status:200,headers:noStore({'Content-Type':'text/html; charset=utf-8','X-Robots-Tag':'noindex'})});
  } catch(e) {console.error('공유 사진 찾기 실패:',e);return error('사진을 찾는 중 서버 오류가 발생했어요.',502);}
}

export async function image(request) {
  const id=idFrom(request);
  if(!validToken(id)) return new Response('Not found',{status:404,headers:noStore()});
  try {
    if(!(await getValidRecord(id))) return new Response('Not found',{status:404,headers:noStore()});
    const { get } = await import('@vercel/blob');
    const result = await get(pathname(id),{access:'private'});
    if(!result || result.statusCode!==200) return new Response('Not found',{status:404,headers:noStore()});
    return new Response(result.stream,{status:200,headers:noStore({'Content-Type':'image/png','X-Robots-Tag':'noindex'})});
  } catch(e) {console.error('공유 이미지 가져오기 실패:',e);return error('이미지를 읽을 수 없어요.',502);}
}

export function health(){return json({ok:true,service:'momentcut',mode:'vercel'});}
