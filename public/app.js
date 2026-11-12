'use strict';
const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const ui = {
  canvas: $('#photoCanvas'), video: $('#cameraVideo'), stage: $('#cameraStage'),
  toast: $('#toast'), shotGrid: $('#shotGrid')
};
const PALETTE = [
  ['밀크','#ffffff'],['잉크','#29242b'],['핑크','#ffd2e2'],['라벤더','#d9c5f7'],
  ['베이비블루','#bfdff6'],['민트','#cceade'],['버터','#ffecae'],['피치','#ffcab9']
];
const THEMES = [['clean','기본 ✦'],['dots','도트 ···'],['check','체크 ▦'],['hearts','하트 ♡'],['retro','레트로 ✳'],['film','필름 ▤']];
const FILTERS = [['none','원본','none'],['bw','흑백','grayscale(1) contrast(1.09)'],['warm','따뜻하게','sepia(.22) saturate(1.25) contrast(1.05)'],['cool','시원하게','hue-rotate(14deg) saturate(.85)'],['vintage','빈티지','sepia(.36) saturate(.77) contrast(.95)'],['dream','드리미','saturate(1.25) brightness(1.08) contrast(.89)']];
const STICKERS = ['💗','⭐','🎀','🍒','🐰','🌷','✨','🩷','🫶','🐻','💜','🦋','☁️','🌈','🍓','🎈','👑','🌸','💫','💌','🧸','🍀','🫧','😽','💛','✌️','♡','✿'];
const state = {
  count:4,timer:3,photos:[null,null,null,null],stream:null,busy:false,retakeIndex:null,
  color:'#ffd2e2',theme:'clean',layout:'vertical',filter:'none',stickers:[],selectedSticker:null,
  title:'our little moment ♡',subtitle:'영원히 기억할 오늘',font:'sans',showDate:true,showLogo:true,
  logoUrl:null,date:new Date(),shareUrl:null,page:'home',renderNonce:0,setupDone:false,customFrame:null,availableFrames:[]
};
const photoCache = new Map();
let toastTimer = null;
function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2900)}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function escapeHTML(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function go(page){
  if(!['home','setup','capture','edit','result'].includes(page))return;
  if(page==='capture'&&!state.setupDone){page='setup';}
  if(state.busy && state.page==='capture' && page!=='capture'){toast('촬영을 마친 뒤 이동할 수 있어요.');return;}
  if(page==='result' && state.photos.every(p=>!p)){toast('촬영하거나 샘플로 체험한 뒤 완성할 수 있어요.');page='capture'}
  if(page==='edit' && state.photos.every(p=>!p)){toast('먼저 사진을 찍거나 샘플로 체험해 주세요.');page='capture'}
  if(state.page==='capture'&&page!=='capture'&&!state.busy)stopCamera();
  $$('.page').forEach(p=>p.classList.toggle('active',p.id===page));
  $$('.nav-link').forEach(b=>b.classList.toggle('active',b.dataset.go===page));
  state.page=page;window.scrollTo({top:0,behavior:'instant'});
  if(page==='capture')startCamera();
  if(page==='edit'){loadAdminFrames();renderPreview();}
  if(page==='result')showResult();
  history.replaceState(null,'','#'+page);
}
$$('[data-go]').forEach(b=>b.addEventListener('click',e=>{e.preventDefault();go(b.dataset.go)}));
$('#demoBtn').addEventListener('click',()=>{
  stopCamera();state.count=4;state.photos=createDemoPhotos(4);state.retakeIndex=null;state.setupDone=true;
  updateCaptureUI();renderLayoutOptions();toast('샘플 사진으로 꾸미기를 시작해 볼까요?');go('edit');
});

async function startCamera(){
  if(state.stream||state.busy)return;
  if(!navigator.mediaDevices?.getUserMedia){
    $('#cameraHelp').textContent='이 브라우저에서는 카메라를 사용할 수 없어요. HTTPS 또는 localhost에서 열거나 사진을 업로드해 주세요.';
    return;
  }
  $('#openCameraBtn').disabled=true;$('#cameraStatus').textContent='카메라 연결 중…';
  try{
    state.stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:1280},height:{ideal:960}}});
    ui.video.srcObject=state.stream;await ui.video.play();
    ui.stage.classList.add('ready');$('#cameraStatus').textContent='촬영 준비 완료 ✦';
    $('#cameraHelp').textContent='촬영된 사진은 기본적으로 브라우저에서만 처리돼요.';
    $('#openCameraBtn').textContent='✓ 카메라 연결됨';
  }catch(err){
    const rejected=['NotAllowedError','PermissionDeniedError'].includes(err.name);
    $('#cameraStatus').textContent='카메라 연결 안 됨';
    $('#cameraHelp').textContent=rejected?'카메라 권한이 거부됐어요. 브라우저 설정에서 허용하거나 사진을 업로드해 주세요.':'카메라를 찾을 수 없어요. 사진 업로드로도 이용할 수 있어요.';
    toast(rejected?'카메라 사용 권한을 확인해 주세요.':'카메라 연결에 실패했어요.');
  }finally{$('#openCameraBtn').disabled=false;updateCaptureUI()}
}
function stopCamera(){
  if(state.stream){state.stream.getTracks().forEach(t=>t.stop());state.stream=null}
  ui.video.srcObject=null;ui.stage.classList.remove('ready');$('#openCameraBtn').textContent='◎ 카메라 켜기';
  $('#cameraStatus').textContent='카메라 대기 중';updateCaptureUI();
}
$('#openCameraBtn').addEventListener('click',()=>state.stream?stopCamera():startCamera());
function setCount(n){
  if(state.busy)return;
  state.count=n;state.photos=Array.from({length:n},(_,i)=>state.photos[i]||null);
  state.retakeIndex=null;state.layout=n===4?'vertical':'grid2';state.customFrame=null;
  updateCaptureUI();renderLayoutOptions();renderPreview();updateSetupSummary();
}
function setTimer(n){state.timer=n;$$('#timerSelector button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.timer)===n));
  $('#modeHint').textContent=n===0?'✧ 셔터를 누를 때마다 한 컷씩 촬영해요. 원하는 타이밍에 찰칵!':`✧ 셔터를 누르면 ${n}초 카운트다운 후 촬영해요. 남은 컷도 자동으로 찍어요.`;
  updateCaptureUI();updateSetupSummary();
}
$$('#countSelector button').forEach(b=>b.addEventListener('click',()=>setCount(Number(b.dataset.count))));
$$('#timerSelector button').forEach(b=>b.addEventListener('click',()=>setTimer(Number(b.dataset.timer))));
function updateSetupSummary(){
  const description=`${state.count}컷 · ${state.timer===0?'직접 촬영':state.timer+'초 자동 촬영'}`;
  $('#setupSummary').textContent=description;
  $('#captureSettingsSummary').textContent=description;
}
$('#beginCaptureBtn').addEventListener('click',()=>{state.setupDone=true;go('capture')});
$('#backToSetupBtn').addEventListener('click',()=>go('setup'));
function fullReset(){
  if(state.busy){toast('촬영이 끝난 후 초기화할 수 있어요.');return}
  if(!window.confirm('촬영한 모든 사진과 꾸미기 설정을 지우고 처음부터 다시 시작할까요?'))return;
  stopCamera();photoCache.clear();state.renderNonce++;
  Object.assign(state,{count:4,timer:3,photos:[null,null,null,null],retakeIndex:null,setupDone:false,shareUrl:null,date:new Date(),customFrame:null});
  const old=$('#finalImage').dataset.objectUrl;if(old)URL.revokeObjectURL(old);
  $('#finalImage').removeAttribute('src');delete $('#finalImage').dataset.objectUrl;
  $('#shareBox').classList.add('hidden');$('#shareStatus').textContent='';$('#shareLink').value='';
  $('#countdown').classList.add('hidden');$('#photoUpload').value='';resetStyle();
  setTimer(3);updateCaptureUI();updateSetupSummary();go('setup');toast('사진과 설정을 모두 초기화했어요.');
}
['fullResetCaptureBtn','fullResetEditBtn','fullResetResultBtn','fullResetSetupBtn'].forEach(id=>$('#'+id).addEventListener('click',fullReset));

function updateCaptureUI(){
  $$('#countSelector button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.count)===state.count));
  let filled=state.photos.filter(Boolean).length;
  $('#captureCounter').textContent=`${filled} / ${state.count} SHOTS`;
  $('#shotBadge').textContent=`${filled} / ${state.count}`;
  ui.shotGrid.innerHTML=state.photos.map((photo,i)=>`<button type="button" class="shot-cell ${photo?'filled':''}" data-retake="${i}" aria-label="${i+1}번 컷 ${photo?'다시 찍기':'비어 있음'}">${photo?`<img src="${photo}" alt="${i+1}번 사진">`:'+'}<span class="shot-index">${String(i+1).padStart(2,'0')}</span></button>`).join('');
  $$('[data-retake]',ui.shotGrid).forEach(b=>b.addEventListener('click',()=>{if(!state.busy&&state.photos[Number(b.dataset.retake)]){state.retakeIndex=Number(b.dataset.retake);toast(`${state.retakeIndex+1}번 컷을 다시 찍을게요.`);if(!state.stream)startCamera();updateCaptureUI()}}));
  $('#toEditorBtn').disabled=filled!==state.count||state.busy;
  $('#shutterBtn').disabled=!state.stream||state.busy;
  const label=state.retakeIndex!==null?`${state.retakeIndex+1}번 컷 다시 찍기`:filled===state.count?'새로 촬영하기':(state.timer===0?'한 컷 촬영':'촬영 시작');
  $('#shutterLabel').textContent=label;
}
async function countdown(seconds){
  const el=$('#countdown');
  for(let n=seconds;n>=1;n--){el.textContent=n;el.classList.remove('hidden');el.style.animation='none';void el.offsetWidth;el.style.animation='';await sleep(1000)}
  el.classList.add('hidden');
}
function takeSnapshot(){
  if(!state.stream||!ui.video.videoWidth)throw new Error('카메라가 준비되지 않았어요.');
  const cvs=document.createElement('canvas');cvs.width=1200;cvs.height=900;
  const ctx=cvs.getContext('2d');let vw=ui.video.videoWidth,vh=ui.video.videoHeight;
  const sourceRatio=vw/vh,targetRatio=4/3;
  let sw=vw,sh=vh,sx=0,sy=0;
  if(sourceRatio>targetRatio){sw=vh*targetRatio;sx=(vw-sw)/2}else{sh=vw/targetRatio;sy=(vh-sh)/2}
  ctx.translate(cvs.width,0);ctx.scale(-1,1);ctx.drawImage(ui.video,sx,sy,sw,sh,0,0,cvs.width,cvs.height);
  return cvs.toDataURL('image/jpeg',.91);
}
function flash(){const f=$('#flash');f.classList.remove('fire');void f.offsetWidth;f.classList.add('fire')}
async function shutter(){
  if(state.busy||!state.stream)return;
  if(state.photos.every(Boolean)&&state.retakeIndex===null){state.photos=Array(state.count).fill(null);state.shareUrl=null;toast('새로운 촬영을 시작할게요!')}
  state.busy=true;updateCaptureUI();
  try{
    const indices=state.retakeIndex!==null?[state.retakeIndex]:state.photos.map((p,i)=>p?null:i).filter(i=>i!==null);
    const total=state.timer===0?indices.slice(0,1):indices;
    for(let i=0;i<total.length;i++){
      if(!state.stream)break;
      const index=total[i];
      $('#cameraStatus').textContent=`${index+1}번째 컷 준비!`;
      if(state.timer>0)await countdown(state.timer);
      const image=takeSnapshot();flash();state.photos[index]=image;
      $('#cameraStatus').textContent=`${index+1}번째 컷 촬영 완료 ♡`;
      updateCaptureUI();
      if(i<total.length-1)await sleep(700);
    }
    state.retakeIndex=null;state.shareUrl=null;
    if(state.photos.every(Boolean)){toast('촬영 완료! 이제 예쁘게 꾸며봐요 ✨')}
  }catch(err){toast(err.message||'촬영 중 문제가 생겼어요.')}
  finally{state.busy=false;$('#countdown').classList.add('hidden');updateCaptureUI()}
}
$('#shutterBtn').addEventListener('click',shutter);
$('#toEditorBtn').addEventListener('click',()=>{if(state.photos.every(Boolean)){go('edit')}else toast('모든 컷을 채워주세요.')});
$('#photoUpload').addEventListener('change',async e=>{
  const files=[...e.target.files].filter(f=>f.type.startsWith('image/'));
  let slots=state.retakeIndex!==null?[state.retakeIndex]:state.photos.map((p,i)=>p?null:i).filter(i=>i!==null);
  if(!slots.length)slots=state.photos.map((_,i)=>i);
  for(const f of files.slice(0,slots.length)){
    try{const data=await resizeImageFile(f);state.photos[slots.shift()]=data}catch(err){toast(`${f.name}: 이미지 파일을 열지 못했어요.`)}
  }
  state.retakeIndex=null;state.shareUrl=null;updateCaptureUI();e.target.value='';
  if(state.photos.every(Boolean))toast('사진을 모두 채웠어요. 이제 꾸며봐요!');
});
async function resizeImageFile(file){
  const url=URL.createObjectURL(file);
  try{const img=await loadImage(url);const c=document.createElement('canvas');c.width=1200;c.height=900;
    const ctx=c.getContext('2d');drawCover(ctx,img,0,0,1200,900);return c.toDataURL('image/jpeg',.91)
  }finally{URL.revokeObjectURL(url)}
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('이미지를 열 수 없음'));img.src=src})}
function drawCover(ctx,img,x,y,w,h){
  const r=Math.max(w/img.width,h/img.height),sw=w/r,sh=h/r;
  ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h);
}
function getLayouts(){return state.count===4?[['vertical','세로 4컷',1,4],['grid2','2 × 2',2,2]]:[['grid2','2 × 3',2,3],['vertical','세로 6컷',1,6],['grid3','3 × 2',3,2]]}
function renderLayoutOptions(){
  $('#layoutOptions').innerHTML=getLayouts().map(([id,label,cols,rows])=>`<button class="layout-opt ${state.layout===id?'selected':''}" data-layout="${id}" aria-pressed="${state.layout===id}"><span class="layout-drawing" style="grid-template-columns:repeat(${cols},1fr);grid-template-rows:repeat(${rows},1fr)">${Array.from({length:state.count},()=>'<b></b>').join('')}</span>${label}</button>`).join('');
  $$('[data-layout]').forEach(b=>b.addEventListener('click',()=>{state.layout=b.dataset.layout;state.customFrame=null;renderAdminFrameOptions();renderLayoutOptions();renderPreview()}));
}
function renderThemeOptions(){
  $('#themeOptions').innerHTML=THEMES.map(([id,label])=>`<button class="theme-chip ${state.theme===id?'selected':''}" data-theme="${id}">${label}</button>`).join('');
  $$('[data-theme]').forEach(b=>b.addEventListener('click',()=>{state.theme=b.dataset.theme;state.customFrame=null;renderAdminFrameOptions();renderThemeOptions();renderPreview()}));
}
function renderColorOptions(){
  $('#colorOptions').innerHTML=PALETTE.map(([label,c])=>`<button class="swatch ${state.color===c?'selected':''}" data-color="${c}" style="background:${c}" aria-label="${label}" title="${label}" aria-pressed="${state.color===c}"></button>`).join('');
  $$('[data-color]').forEach(b=>b.addEventListener('click',()=>{state.color=b.dataset.color;state.customFrame=null;renderAdminFrameOptions();$('#customFrameColor').value=state.color;renderColorOptions();renderPreview()}));
}
$('#customFrameColor').addEventListener('input',e=>{state.color=e.target.value;state.customFrame=null;renderAdminFrameOptions();renderColorOptions();renderPreview()});
function renderFilterOptions(){
  $('#filterOptions').innerHTML=FILTERS.map(([id,label,css])=>`<button class="filter-item ${state.filter===id?'selected':''}" data-filter="${id}"><div class="filter-thumb" style="filter:${css}"></div>${label}</button>`).join('');
  $$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{state.filter=b.dataset.filter;renderFilterOptions();renderPreview()}));
}
function renderStickerOptions(){
  $('#stickerOptions').innerHTML=STICKERS.map(emoji=>`<button data-sticker="${escapeHTML(emoji)}" aria-label="${escapeHTML(emoji)} 스티커 추가">${emoji}</button>`).join('');
  $$('[data-sticker]').forEach(b=>b.addEventListener('click',()=>{
    const s={id:crypto.randomUUID?.()||String(Date.now()+Math.random()),emoji:b.dataset.sticker,x:.48+Math.random()*.1,y:.37+Math.random()*.2};
    state.stickers.push(s);state.selectedSticker=s.id;$('#removeStickerBtn').disabled=false;renderPreview();toast('스티커를 움직여 원하는 위치에 놓아주세요!');
  }));
}
$$('.edit-tab').forEach(button=>button.addEventListener('click',()=>{
  const tab=button.dataset.tab;
  $$('.edit-tab').forEach(b=>{b.classList.toggle('active',b===button);b.setAttribute('aria-selected',String(b===button))});
  $$('.tab-body').forEach(body=>body.classList.toggle('active',body.id==='tab-'+tab));
}));
$('#removeStickerBtn').addEventListener('click',()=>{
  state.stickers=state.stickers.filter(s=>s.id!==state.selectedSticker);state.selectedSticker=null;
  $('#removeStickerBtn').disabled=true;renderPreview();
});
$('#clearStickersBtn').addEventListener('click',()=>{state.stickers=[];state.selectedSticker=null;$('#removeStickerBtn').disabled=true;renderPreview()});
[['printTitle','title'],['printSubtitle','subtitle']].forEach(([id,key])=>$('#'+id).addEventListener('input',e=>{state[key]=e.target.value;renderPreview()}));
$$('#fontSelector button').forEach(b=>b.addEventListener('click',()=>{
  state.font=b.dataset.font;$$('#fontSelector button').forEach(c=>c.classList.toggle('selected',c===b));renderPreview();
}));
$('#showDate').addEventListener('change',e=>{state.showDate=e.target.checked;renderPreview()});
$('#showLogo').addEventListener('change',e=>{state.showLogo=e.target.checked;renderPreview()});
$('#logoUpload').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)||f.size>3*1024*1024){toast('3MB 이하 PNG, JPG, WEBP, SVG 로고만 올려주세요.');return}
  try{const src=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});
    await loadImage(src);state.logoUrl=src;$('#logoFileName').textContent=f.name;$('#clearLogoBtn').classList.remove('hidden');renderPreview();
  }catch(err){toast('로고 이미지를 확인해 주세요.')}e.target.value='';
});
$('#clearLogoBtn').addEventListener('click',()=>{state.logoUrl=null;$('#clearLogoBtn').classList.add('hidden');$('#logoFileName').textContent='투명 배경 PNG를 추천해요.';renderPreview()});
function resetStyle(){
  Object.assign(state,{customFrame:null,color:'#ffd2e2',theme:'clean',layout:state.count===4?'vertical':'grid2',filter:'none',stickers:[],selectedSticker:null,title:'our little moment ♡',subtitle:'영원히 기억할 오늘',font:'sans',showDate:true,showLogo:true,logoUrl:null});
  $('#printTitle').value=state.title;$('#printSubtitle').value=state.subtitle;$('#showDate').checked=true;$('#showLogo').checked=true;
  $('#customFrameColor').value=state.color;$('#clearLogoBtn').classList.add('hidden');$('#logoFileName').textContent='투명 배경 PNG를 추천해요.';
  $$('#fontSelector button').forEach(b=>b.classList.toggle('selected',b.dataset.font===state.font));$('#removeStickerBtn').disabled=true;
  renderAllOptions();renderPreview();
}
$('#resetStyleBtn').addEventListener('click',()=>{resetStyle();toast('꾸미기 설정을 초기화했어요.')});
$('#shuffleStyleBtn').addEventListener('click',()=>{
  const layouts=getLayouts();state.color=PALETTE[Math.floor(Math.random()*PALETTE.length)][1];state.theme=THEMES[Math.floor(Math.random()*THEMES.length)][0];
  state.filter=FILTERS[Math.floor(Math.random()*FILTERS.length)][0];state.customFrame=null;renderAdminFrameOptions();state.layout=layouts[Math.floor(Math.random()*layouts.length)][0];
  $('#customFrameColor').value=state.color;renderAllOptions();renderPreview();
});
function renderAllOptions(){renderLayoutOptions();renderThemeOptions();renderColorOptions();renderFilterOptions();renderStickerOptions()}
async function loadAdminFrames(){
  try{
    const response=await fetch('/api/frames',{cache:'no-store'});
    if(!response.ok)throw Error('관리자 프레임 서버가 아직 준비되지 않았어요.');
    const data=await response.json();state.availableFrames=Array.isArray(data.frames)?data.frames:[];
    if(state.customFrame){const newer=state.availableFrames.find(f=>f.id===state.customFrame.id);if(newer)state.customFrame=newer;}
    renderAdminFrameOptions();
  }catch(err){$('#adminFrameOptions').innerHTML='<p class="small-note">관리자 프레임을 불러올 수 없어요. 기본 프레임은 이용할 수 있어요.</p>';}
}
function renderAdminFrameOptions(){
  const options=state.availableFrames.filter(f=>f.count===state.count);
  $('#clearAdminFrameBtn').classList.toggle('hidden',!state.customFrame);
  if(!options.length){$('#adminFrameOptions').innerHTML='<p class="small-note">이 컷 수에 등록된 특별 프레임이 아직 없어요.</p>';return}
  $('#adminFrameOptions').innerHTML=options.map(frame=>`<button class="community-frame ${state.customFrame?.id===frame.id?'selected':''}" data-special-frame="${frame.id}" aria-pressed="${state.customFrame?.id===frame.id}">${frame.imageKey?`<img src="/api/frame-image?id=${encodeURIComponent(frame.id)}&v=${encodeURIComponent(frame.updatedAt)}" alt="">`:'<span class="frame-placeholder">✿</span>'}<strong>${escapeHTML(frame.name)}</strong><small>${frame.count}컷 전용</small></button>`).join('');
  $$('[data-special-frame]').forEach(b=>b.addEventListener('click',()=>{
    const frame=options.find(f=>f.id===b.dataset.specialFrame);if(!frame)return;
    state.customFrame=frame;state.color=frame.color;state.title=frame.title;state.subtitle=frame.subtitle;
    $('#printTitle').value=state.title;$('#printSubtitle').value=state.subtitle;
    renderLayoutOptions();renderAdminFrameOptions();renderPreview();toast(`${frame.name} 프레임을 선택했어요!`);
  }));
}
$('#clearAdminFrameBtn').addEventListener('click',()=>{state.customFrame=null;renderAdminFrameOptions();renderPreview()});


function getGeometry(){
  const layout=getLayouts().find(x=>x[0]===state.layout)||getLayouts()[0];
  const cols=layout[2],rows=layout[3],w=cols===3?1500:cols===2?1200:900;
  const margin=cols===1?55:64,gap=cols===1?17:20,top=cols===1?102:98,footer=cols===1?197:194;
  const cellW=(w-margin*2-gap*(cols-1))/cols,cellH=Math.round(cellW*.74);
  const h=Math.round(top+cellH*rows+gap*(rows-1)+footer);
  return{w,h,cols,rows,margin,gap,top,footer,cellW,cellH,photoBottom:top+cellH*rows+gap*(rows-1)};
}
function blendTextColor(hex){
  const c=hex.replace('#','');if(c.length!==6)return'#2c2630';
  const rgb=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<.29?'#fffafa':'#2c2630';
}
function makeFramePattern(ctx,g,ink){
  const{w,h,theme}= {...g,theme:state.theme};
  ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle=ink;ctx.fillStyle=ink;
  if(theme==='dots'){
    for(let y=28;y<h-20;y+=38){for(let x=25;x<w-20;x+=38){if((x<g.margin-14||x>w-g.margin+14||y<g.top-25||y>g.photoBottom+25)){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}}}
  }else if(theme==='check'){
    ctx.globalAlpha=.13;let step=32;
    for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){if(((x/step+y/step)&1)===0)ctx.fillRect(x,y,step,step)}}
  }else if(theme==='hearts'){
    ctx.font='26px serif';for(let y=45;y<h-10;y+=145){ctx.fillText('♡',14,y);ctx.fillText('♡',w-43,y)}
  }else if(theme==='retro'){
    ctx.font='bold 33px serif';for(let y=38;y<h;y+=125){ctx.fillText('✳',8,y);ctx.fillText('✧',w-42,y+50)}
  }else if(theme==='film'){
    ctx.globalAlpha=.4;
    for(let y=15;y<h-8;y+=52){ctx.fillRect(12,y,25,31);ctx.fillRect(w-37,y,25,31)}
  }
  ctx.restore();
}
function fitText(ctx,text,maxWidth,size,minSize=15){
  let x=size;while(ctx.measureText(text).width>maxWidth&&x>minSize){x-=2;ctx.font=ctx.font.replace(/\d+(?=px)/,String(x))}return x;
}

async function renderAdminCustomFrame(req){
  const frame=state.customFrame;
  if(!frame)return;
  const imgs=await Promise.all(state.photos.slice(0,state.count).map(async src=>{
    if(!src)return null;if(photoCache.has(src))return photoCache.get(src);
    try{const im=await loadImage(src);photoCache.set(src,im);return im}catch{return null}
  }));
  let overlay=null,logo=null;
  if(frame.imageKey){try{overlay=await loadImage(`/api/frame-image?id=${encodeURIComponent(frame.id)}&v=${encodeURIComponent(frame.updatedAt)}`)}catch{}}
  if(state.logoUrl){try{logo=await loadImage(state.logoUrl)}catch{}}
  if(req!==state.renderNonce)return;
  const canvas=ui.canvas;canvas.width=frame.width;canvas.height=frame.height;
  const ctx=canvas.getContext('2d');ctx.fillStyle=frame.color;ctx.fillRect(0,0,frame.width,frame.height);
  const filter=FILTERS.find(x=>x[0]===state.filter)?.[2]||'none';
  frame.slots.forEach((slot,i)=>{
    const x=slot.x*frame.width,y=slot.y*frame.height,w=slot.w*frame.width,h=slot.h*frame.height;
    ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();
    if(imgs[i]){ctx.filter=filter;drawCover(ctx,imgs[i],x,y,w,h);ctx.filter='none'}
    else{ctx.fillStyle='#f0ddeb';ctx.fillRect(x,y,w,h);ctx.fillStyle='#9b82a2';ctx.textAlign='center';ctx.font=`bold ${Math.max(13,Math.min(w*.09,46))}px Arial`;ctx.fillText(`PHOTO ${i+1}`,x+w/2,y+h/2)}
    ctx.restore();
  });
  if(overlay)ctx.drawImage(overlay,0,0,frame.width,frame.height);
  ctx.fillStyle=frame.textColor;ctx.textAlign='center';ctx.textBaseline='middle';
  ctx.font=`bold ${frame.titleSize}px ${state.font==='serif'?'Georgia,serif':state.font==='hand'?'cursive':'Arial,sans-serif'}`;
  fitText(ctx,state.title.trim(),frame.width*.9,frame.titleSize,14);
  if(state.title.trim())ctx.fillText(state.title.trim(),frame.width/2,frame.height*frame.titleY);
  ctx.font=`${Math.max(13,Math.round(frame.titleSize*.53))}px Arial,sans-serif`;
  fitText(ctx,state.subtitle.trim(),frame.width*.9,Math.max(13,Math.round(frame.titleSize*.53)),12);
  if(state.subtitle.trim())ctx.fillText(state.subtitle.trim(),frame.width/2,frame.height*frame.subtitleY);
  if(state.showDate){const d=state.date;ctx.font=`${Math.max(12,Math.round(frame.width*.019))}px Arial,sans-serif`;ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`,frame.width/2,frame.height*.978)}
  if(state.showLogo){ctx.save();ctx.textAlign='right';ctx.font=`bold ${Math.max(13,Math.round(frame.width*.023))}px Arial`;ctx.fillText('momentcut.',frame.width*.965,frame.height*.025);ctx.restore()}
  if(logo){const scale=Math.min(frame.width*.15/logo.width,frame.height*.08/logo.height);ctx.drawImage(logo,frame.width*.82,frame.height*.9,logo.width*scale,logo.height*scale)}
  for(const sticker of state.stickers){const x=sticker.x*frame.width,y=sticker.y*frame.height,size=Math.round(frame.width*.065);
    ctx.save();ctx.font=`${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sticker.emoji,x,y);ctx.restore();
    if(sticker.id===state.selectedSticker&&state.page==='edit'){ctx.save();ctx.setLineDash([9,7]);ctx.strokeStyle='#9c60d8';ctx.lineWidth=3;ctx.strokeRect(x-size*.6,y-size*.6,size*1.2,size*1.2);ctx.restore()}
  }
}
async function renderPreview(){
  if(state.customFrame){const req=++state.renderNonce;return renderAdminCustomFrame(req)}
  const req=++state.renderNonce;
  const g=getGeometry(),canvas=ui.canvas;
  const imgSources=state.photos.slice(0,state.count);
  const resources=await Promise.all(imgSources.map(async src=>{
    if(!src)return null;
    if(photoCache.has(src))return photoCache.get(src);
    try{const image=await loadImage(src);photoCache.set(src,image);if(photoCache.size>18)photoCache.delete(photoCache.keys().next().value);return image}catch{return null}
  }));
  let logo=null;if(state.logoUrl){try{logo=await loadImage(state.logoUrl)}catch{}}
  if(req!==state.renderNonce)return;
  canvas.width=g.w;canvas.height=g.h;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle=state.color;ctx.fillRect(0,0,g.w,g.h);
  const ink=blendTextColor(state.color);
  makeFramePattern(ctx,g,ink);
  ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${g.cols===1?28:30}px Arial,sans-serif`;
  if(state.showLogo)ctx.fillText('momentcut.',g.w/2,48);
  else ctx.fillText('✧ ✧ ✧',g.w/2,48);
  ctx.font='12px Arial,sans-serif';ctx.globalAlpha=.66;ctx.fillText('OUR LITTLE PHOTO BOOTH',g.w/2,75);ctx.globalAlpha=1;
  const filter=FILTERS.find(f=>f[0]===state.filter)?.[2]||'none';
  for(let i=0;i<state.count;i++){
    const c=i%g.cols,r=Math.floor(i/g.cols),x=g.margin+c*(g.cellW+g.gap),y=g.top+r*(g.cellH+g.gap);
    ctx.save();ctx.fillStyle='#f5eef5';ctx.fillRect(x,y,g.cellW,g.cellH);
    if(resources[i]){
      ctx.beginPath();ctx.rect(x,y,g.cellW,g.cellH);ctx.clip();ctx.filter=filter;drawCover(ctx,resources[i],x,y,g.cellW,g.cellH);ctx.filter='none';
    }else{
      const grd=ctx.createLinearGradient(x,y,x+g.cellW,y+g.cellH);grd.addColorStop(0,'#f5e0ea');grd.addColorStop(1,'#ded4f3');ctx.fillStyle=grd;ctx.fillRect(x,y,g.cellW,g.cellH);
      ctx.fillStyle='#a795af';ctx.font=`900 ${Math.round(g.cellW*.12)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✧',x+g.cellW/2,y+g.cellH/2-25);
      ctx.font=`bold ${Math.round(g.cellW*.035)}px Arial`;ctx.fillText(`PHOTO ${String(i+1).padStart(2,'0')}`,x+g.cellW/2,y+g.cellH/2+30);
    }ctx.restore();
  }
  const y=g.photoBottom;
  const titleFont=state.font==='serif'?`700 37px Georgia,serif`:state.font==='hand'?`italic 700 37px cursive`:`900 37px Arial,sans-serif`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=ink;ctx.font=titleFont;
  let title=state.title.trim()||'our little moment ♡';fitText(ctx,title,g.w-140,37,20);
  ctx.fillText(title,g.w/2,y+69);
  ctx.font=state.font==='serif'?'20px Georgia,serif':'19px Arial,sans-serif';ctx.globalAlpha=.83;
  let subtitle=state.subtitle.trim();if(subtitle){fitText(ctx,subtitle,g.w-160,19,12);ctx.fillText(subtitle,g.w/2,y+111)}
  ctx.globalAlpha=.62;ctx.font='bold 17px Arial,sans-serif';
  if(state.showDate){const d=state.date;ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`,g.w/2,y+151)}
  if(logo){let maxW=110,maxH=60,scale=Math.min(maxW/logo.width,maxH/logo.height);ctx.globalAlpha=1;ctx.drawImage(logo,g.w-145,g.h-85,logo.width*scale,logo.height*scale)}
  ctx.globalAlpha=1;
  for(const sticker of state.stickers){
    const x=sticker.x*g.w,y=sticker.y*g.h,size=Math.round(g.w*.065);
    ctx.save();ctx.font=`${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='#43334a55';ctx.shadowBlur=3;ctx.fillText(sticker.emoji,x,y);ctx.restore();
    if(sticker.id===state.selectedSticker && state.page==='edit'){
      ctx.save();ctx.setLineDash([9,7]);ctx.lineWidth=3;ctx.strokeStyle='#9c60d8';ctx.strokeRect(x-size*.58,y-size*.59,size*1.16,size*1.18);ctx.restore();
    }
  }
  return canvas;
}
let dragging=false;
function pointOnCanvas(event){const rect=ui.canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height}}
ui.canvas.addEventListener('pointerdown',e=>{
  if(!state.stickers.length)return;const p=pointOnCanvas(e),minDist=.11;
  let best=null,bestDist=Infinity;
  for(const s of state.stickers){const dx=(p.x-s.x),dy=(p.y-s.y)*(ui.canvas.height/ui.canvas.width);const distance=Math.hypot(dx,dy);if(distance<bestDist){bestDist=distance;best=s}}
  if(best&&bestDist<minDist){state.selectedSticker=best.id;dragging=true;ui.canvas.setPointerCapture(e.pointerId);$('#removeStickerBtn').disabled=false;renderPreview()}
  else{state.selectedSticker=null;$('#removeStickerBtn').disabled=true;renderPreview()}
});
ui.canvas.addEventListener('pointermove',e=>{
  if(!dragging||!state.selectedSticker)return;
  const p=pointOnCanvas(e),s=state.stickers.find(x=>x.id===state.selectedSticker);
  if(s){s.x=Math.max(.03,Math.min(.97,p.x));s.y=Math.max(.03,Math.min(.97,p.y));renderPreview()}
});
for(const name of ['pointerup','pointercancel','lostpointercapture'])ui.canvas.addEventListener(name,()=>{dragging=false});

$('#finishBtn').addEventListener('click',()=>go('result'));
async function createFinalBlob(){
  const oldSelection=state.selectedSticker;state.selectedSticker=null;
  await renderPreview();const blob=await new Promise(resolve=>ui.canvas.toBlob(resolve,'image/png'));
  state.selectedSticker=oldSelection;
  if(state.page==='edit')renderPreview();
  if(!blob)throw new Error('이미지를 만들 수 없어요.');return blob;
}
async function showResult(){
  $('#shareBox').classList.add('hidden');$('#shareStatus').textContent='';
  try{const blob=await createFinalBlob();const old=$('#finalImage').dataset.objectUrl;if(old)URL.revokeObjectURL(old);let url=URL.createObjectURL(blob);$('#finalImage').src=url;$('#finalImage').dataset.objectUrl=url;}
  catch{toast('사진 렌더링에 문제가 생겼어요.')}
  state.shareUrl=null;
}
async function downloadPhoto(){
  try{const blob=await createFinalBlob();const url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download=`momentcut_${new Date().toISOString().slice(0,10)}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('고화질 PNG 저장을 시작했어요!');
  }catch{toast('저장에 실패했어요. 다시 시도해 주세요.')}
}
$('#downloadBtn').addEventListener('click',downloadPhoto);
$('#shareFileBtn').addEventListener('click',async()=>{
  try{const blob=await createFinalBlob(),file=new File([blob],'momentcut.png',{type:'image/png'});
    if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:'모먼트컷 사진 ♡',text:'우리의 오늘을 공유해요!',files:[file]})}
    else{toast('사진 파일 공유를 지원하지 않는 환경이에요. PNG로 저장해 주세요.');}
  }catch(err){if(err.name!=='AbortError')toast('공유하지 못했어요. PNG로 저장해 주세요.')}
});
$('#createShareBtn').addEventListener('click',async()=>{
  if(state.shareUrl){$('#shareBox').classList.remove('hidden');return}
  const btn=$('#createShareBtn');btn.disabled=true;btn.textContent='QR 생성 중…';$('#shareStatus').textContent='사진을 공유 서버에 올리고 있어요.';
  try{
    const blob=await createFinalBlob();if(blob.size>10*1024*1024)throw new Error('사진이 너무 커요.');
    const base64=await new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
    const response=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64})});
    if(!response.ok){let message='공유 서버를 사용할 수 없어요.';try{const failure=await response.json();message=failure.error||message}catch{}throw new Error(message)}
    const data=await response.json();state.shareUrl=new URL(data.url,location.origin).href;
    $('#qrImage').src=`/api/qr?text=${encodeURIComponent(state.shareUrl)}`;
    $('#shareLink').value=state.shareUrl;$('#shareBox').classList.remove('hidden');
    $('#shareStatus').textContent='공유 링크가 만들어졌어요! 7일 동안 열 수 있어요.';
  }catch(err){$('#shareStatus').textContent=err.message||'QR 링크는 서버 실행 및 인터넷에서 접속 가능한 주소가 필요해요.';toast(err.message||'공유 링크를 만들지 못했어요.')}
  finally{btn.disabled=false;btn.textContent='▦ 공유 링크 · QR 만들기'}
});
$('#copyLinkBtn').addEventListener('click',async()=>{
  try{await navigator.clipboard.writeText($('#shareLink').value);toast('공유 링크를 복사했어요!')}
  catch{$('#shareLink').select();document.execCommand('copy');toast('공유 링크를 복사했어요!')}
});

function createDemoPhotos(n){
  const arr=[];const tones=[['#ead9f3','#bb99cb','#ffdac7','#533f58'],['#fee6ce','#c997b5','#ffd6b8','#633e3e'],['#d5e9e4','#88b7b1','#f5caae','#4c4244'],['#dfdef8','#a9a4d6','#fcd3ba','#5e4b63'],['#f1d7e0','#d69fae','#eec5ad','#5e4848'],['#fce8ba','#d7aa83','#f4c7a6','#563c40']];
  for(let i=0;i<n;i++){
    const c=document.createElement('canvas');c.width=1000;c.height=750;let ctx=c.getContext('2d');const [bg,shirt,skin,hair]=tones[i%tones.length];
    const gradient=ctx.createLinearGradient(0,0,1000,750);gradient.addColorStop(0,bg);gradient.addColorStop(1,'#fff8ef');ctx.fillStyle=gradient;ctx.fillRect(0,0,1000,750);
    ctx.fillStyle='#fff8';for(let j=0;j<6;j++){ctx.beginPath();ctx.arc((j*203+52)%960,(j*149+80)%610,20+j*8,0,Math.PI*2);ctx.fill()}
    ctx.save();ctx.translate(i%2?65:-25,i%3===0?-2:15);ctx.rotate((i-2)*.025);
    ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(510,780,310,270,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(508,337,172,245,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(500,349,138,180,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(476,210,156,90,-.1,Math.PI,Math.PI*2);ctx.fill();
    ctx.fillStyle='#433338';const eyey=345+(i%2)*9;
    for(let dx of [-57,57]){ctx.beginPath();ctx.arc(500+dx,eyey,7,0,Math.PI*2);ctx.fill()}
    ctx.lineWidth=5;ctx.strokeStyle='#b76e73';ctx.beginPath();ctx.arc(500,396,26,.05,Math.PI-.05);ctx.stroke();
    ctx.fillStyle='#f4a4a663';for(let dx of [-83,83]){ctx.beginPath();ctx.ellipse(500+dx,394,27,14,0,0,Math.PI*2);ctx.fill()}
    ctx.restore();ctx.font='bold 71px serif';ctx.fillStyle='#ffffffaa';ctx.fillText(['✦','♡','✳','✿','★','♡'][i%6],135+(i%2)*660,146);
    arr.push(c.toDataURL('image/jpeg',.89));
  }return arr;
}

renderAllOptions();updateCaptureUI();updateSetupSummary();
const incoming=location.hash.slice(1);
if(['setup','capture','edit','result'].includes(incoming))go(incoming);
