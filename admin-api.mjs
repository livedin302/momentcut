/** Admin API: same-origin, HttpOnly signed-session cookie, server-side password validation. */
import crypto from 'node:crypto';
import {listFrames,getFrame,getFrameImage,putFrame,deleteFrame,validId} from './frame-store.mjs';
const cookieName='momentcut_admin';
const duration=8*60*60;
const noStore={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'};
const respond=(data,status=200,extra={})=>Response.json(data,{status,headers:{...noStore,...extra}});
const fail=(message,status=400)=>respond({error:message},status);
const config=()=>({password:process.env.ADMIN_PASSWORD||'',secret:process.env.ADMIN_SESSION_SECRET||''});
const timingEquals=(a,b)=>{const x=crypto.createHash('sha256').update(a).digest(),y=crypto.createHash('sha256').update(b).digest();return crypto.timingSafeEqual(x,y)};
const sign=(message,secret)=>crypto.createHmac('sha256',secret).update(message).digest('base64url');
function makeToken(secret){const data=Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+duration,nonce:crypto.randomBytes(12).toString('hex')})).toString('base64url');return `${data}.${sign(data,secret)}`}
function auth(request){const {password,secret}=config();if(!password||!secret)return false;
  const raw=request.headers.get('cookie')||'';const token=raw.split(';').map(x=>x.trim()).find(x=>x.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)||'';
  if(!/^[A-Za-z0-9_-]{20,300}\.[A-Za-z0-9_-]{43}$/.test(token))return false;
  const [data,sig]=token.split('.');if(!timingEquals(sig,sign(data,secret)))return false;
  try{const payload=JSON.parse(Buffer.from(data,'base64url').toString('utf8'));return Number.isInteger(payload.exp)&&payload.exp>Math.floor(Date.now()/1000)&&payload.exp<Math.floor(Date.now()/1000)+duration+60}catch{return false}
}
function cookie(request,value,maxAge){const secure=new URL(request.url).protocol==='https:'?'; Secure':'';return `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${maxAge}${secure}`}
function originAllowed(request){const origin=request.headers.get('origin');if(origin){try{if(new URL(origin).host!==new URL(request.url).host)return false}catch{return false}}
  const site=request.headers.get('sec-fetch-site');return site!=='cross-site'}
async function boundedJSON(request,max=2_200_000){const length=Number(request.headers.get('content-length')||0);if(length>max)throw Object.assign(new Error('업로드 용량이 너무 커요.'),{status:413});const body=await request.text();if(body.length>max)throw Object.assign(new Error('업로드 용량이 너무 커요.'),{status:413});try{return JSON.parse(body)}catch{throw Object.assign(new Error('JSON 형식을 확인해 주세요.'),{status:400})}}
function verifyFrame(input){
  const f=input?.frame;if(!f||typeof f!=='object')throw Error('프레임 정보가 없습니다.');
  if(!validId(f.id))throw Error('잘못된 프레임 ID입니다.');
  const name=String(f.name||'').trim();if(!name||name.length>42)throw Error('프레임 이름은 1~42자로 입력해 주세요.');
  const count=Number(f.count);if(![4,6].includes(count))throw Error('4컷 또는 6컷을 선택해 주세요.');
  const width=Number(f.width),height=Number(f.height);
  if(!Number.isInteger(width)||width<400||width>2000||!Number.isInteger(height)||height<500||height>4000)throw Error('출력 크기를 확인해 주세요.');
  if(!Array.isArray(f.slots)||f.slots.length!==count)throw Error('사진 영역 개수가 맞지 않아요.');
  const slots=f.slots.map(s=>{const p={x:Number(s.x),y:Number(s.y),w:Number(s.w),h:Number(s.h)};
    if(Object.values(p).some(v=>!Number.isFinite(v))||p.x<0||p.y<0||p.w<.05||p.h<.04||p.x+p.w>1.001||p.y+p.h>1.001)throw Error('사진 영역은 프레임 내부에 배치해 주세요.');
    return Object.fromEntries(Object.entries(p).map(([k,v])=>[k,Math.round(v*10000)/10000]));});
  const color=String(f.color||'');if(!/^#[0-9a-f]{6}$/i.test(color))throw Error('배경 색상을 확인해 주세요.');
  const textColor=String(f.textColor||'');if(!/^#[0-9a-f]{6}$/i.test(textColor))throw Error('문구 색상을 확인해 주세요.');
  const title=String(f.title||'').slice(0,70),subtitle=String(f.subtitle||'').slice(0,90);
  const titleY=Number(f.titleY),subtitleY=Number(f.subtitleY);
  if(!Number.isFinite(titleY)||titleY<0||titleY>1||!Number.isFinite(subtitleY)||subtitleY<0||subtitleY>1)throw Error('문구 위치를 확인해 주세요.');
  const titleSize=Number(f.titleSize);if(!Number.isFinite(titleSize)||titleSize<12||titleSize>100)throw Error('문구 크기를 확인해 주세요.');
  let image=null;
  if(input.imageData){const m=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(input.imageData);
    if(!m)throw Error('PNG, JPG 또는 WEBP 이미지 파일만 사용할 수 있어요.');
    const data=Buffer.from(m[2],'base64');if(data.length<16||data.length>1_500_000)throw Error('프레임 이미지는 1.5MB 이하로 업로드해 주세요.');
    const type='image/'+m[1];const bytes=data.subarray(0,12).toString('hex');
    if(type==='image/png'&&!bytes.startsWith('89504e470d0a1a0a')||type==='image/jpeg'&&!bytes.startsWith('ffd8ff')||type==='image/webp'&&!(data.toString('ascii',0,4)==='RIFF'&&data.toString('ascii',8,12)==='WEBP'))throw Error('이미지 파일 형식이 올바르지 않아요.');
    image={data,type};
  }
  const orientation=['vertical','grid'].includes(f.orientation)?f.orientation:'vertical';
  return {frame:{id:f.id,name,count,orientation,width,height,slots,color,textColor,title,subtitle,titleY,subtitleY,titleSize,removeOverlay:Boolean(input.removeOverlay)},image};
}
export async function frames(){try{return respond({frames:await listFrames()})}catch(e){console.error('프레임 목록 읽기 실패:',e);return fail(e.status===503?e.message:'프레임을 불러오지 못했어요.',e.status||500)}}
export async function frameImage(request){const id=new URL(request.url).searchParams.get('id');if(!validId(id))return new Response('Not found',{status:404,headers:noStore});
  try{const file=await getFrameImage(id);if(!file)return new Response('Not found',{status:404,headers:noStore});return new Response(file.data,{status:200,headers:{...noStore,'Content-Type':file.contentType}})}catch(e){console.error('이미지 읽기 실패:',e);return new Response('Image error',{status:500,headers:noStore})}
}
export async function admin(request){
  const action=new URL(request.url).searchParams.get('action')||'session';
  const {password,secret}=config();
  if(!password||!secret)return fail('관리자 설정이 필요해요. Vercel에 ADMIN_PASSWORD와 ADMIN_SESSION_SECRET을 등록해 주세요.',503);
  if(request.method!=='GET'&&!originAllowed(request))return fail('허용되지 않은 요청입니다.',403);
  try{
    if(action==='login'&&request.method==='POST'){
      const data=await boundedJSON(request,8192);const submitted=typeof data.password==='string'?data.password:'';
      if(submitted.length>200||!timingEquals(submitted,password))return fail('비밀번호가 올바르지 않아요.',401);
      return respond({ok:true},200,{'Set-Cookie':cookie(request,makeToken(secret),duration)});
    }
    if(action==='session'&&request.method==='GET')return respond({authenticated:auth(request)});
    if(!auth(request))return fail('관리자 로그인이 필요해요.',401);
    if(action==='logout'&&request.method==='POST')return respond({ok:true},200,{'Set-Cookie':cookie(request,'',0)});
    if(action==='list'&&request.method==='GET')return respond({frames:await listFrames()});
    if(action==='save'&&request.method==='POST'){
      const data=await boundedJSON(request);const {frame,image}=verifyFrame(data);const already=await getFrame(frame.id);
      if(!already&&(await listFrames()).length>=40)return fail('프레임은 최대 40개까지 등록할 수 있어요.',409);
      return respond({frame:await putFrame(frame,image)});
    }
    if(action==='delete'&&request.method==='POST'){
      const data=await boundedJSON(request,4096);if(!validId(data.id))return fail('프레임 ID가 올바르지 않아요.');
      return respond({deleted:await deleteFrame(data.id)});
    }
    return fail('지원하지 않는 요청입니다.',404);
  }catch(e){console.error('관리자 API 오류:',e);return fail(e.status?e.message:e.message?.includes('프레임')||e.message?.includes('영역')||e.message?.includes('문구')||e.message?.includes('이미지')?e.message:'저장 중 서버 오류가 발생했어요.',e.status||(/^(프레임|잘못된|사진|출력|배경|문구|업로드|PNG|4컷|이미지)/.test(e.message||'')?400:500))}
}
