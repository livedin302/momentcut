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

const LAYOUT_PRESETS = [
  {
    id:'basic4-double', name:'basic 4-cut', note:'가로 사진 4컷 × 2장 · 4x6 세로 용지', count:4, badge:'4 x 6 / 2 strips', orientation:'portrait', photoOrientation:'landscape', previewClass:'dual-strip',
    w:1200, h:1800, footerTop:.85,
    // Each side is one 2x6-inch strip. Four landscape photo windows and a footer belong to EACH strip.
    // The 4x6 sheet is 1200x1800 at 300 DPI, with two independently framed 600x1800 strips.
    slots:[
      {x:.0375,y:.035,w:.425,h:.189,photo:0},{x:.0375,y:.242,w:.425,h:.189,photo:1},{x:.0375,y:.449,w:.425,h:.189,photo:2},{x:.0375,y:.656,w:.425,h:.189,photo:3},
      {x:.5375,y:.035,w:.425,h:.189,photo:0},{x:.5375,y:.242,w:.425,h:.189,photo:1},{x:.5375,y:.449,w:.425,h:.189,photo:2},{x:.5375,y:.656,w:.425,h:.189,photo:3}
    ]
  },
  {
    id:'basic6-grid', name:'basic 6-cut', note:'6컷 · 4x6 세로', count:6, badge:'4 x 6 / 6 cuts', orientation:'portrait', photoOrientation:'landscape', previewClass:'grid6',
    w:1200, h:1800, footerTop:.78,
    slots:[
      {x:.075,y:.095,w:.39,h:.18,photo:0},{x:.535,y:.095,w:.39,h:.18,photo:1},
      {x:.075,y:.300,w:.39,h:.18,photo:2},{x:.535,y:.300,w:.39,h:.18,photo:3},
      {x:.075,y:.505,w:.39,h:.18,photo:4},{x:.535,y:.505,w:.39,h:.18,photo:5}
    ]
  },
  {
    id:'wide4', name:'wide 4-cut', note:'2 x 2 · 6x4 가로', count:4, badge:'6 x 4 / wide', orientation:'landscape', previewClass:'wide4',
    w:1800, h:1200, footerTop:.74,
    slots:[
      {x:.06,y:.08,w:.405,h:.27,photo:0},{x:.535,y:.08,w:.405,h:.27,photo:1},
      {x:.06,y:.39,w:.405,h:.27,photo:2},{x:.535,y:.39,w:.405,h:.27,photo:3}
    ]
  },
  {
    id:'layer4', name:'layer 4-cut', note:'레이어 4컷 · 4x6 세로', count:4, badge:'4 x 6 / layer', orientation:'portrait', photoOrientation:'portrait', previewClass:'layer4',
    w:1200, h:1800, footerTop:.73,
    slots:[
      {x:.085,y:.095,w:.37,h:.25,photo:0},{x:.545,y:.095,w:.37,h:.25,photo:1},
      {x:.085,y:.385,w:.37,h:.25,photo:2},{x:.545,y:.385,w:.37,h:.25,photo:3}
    ]
  },
  {
    id:'film3', name:'film 3-cut', note:'필름 3컷 · 6x4 가로', count:3, badge:'6 x 4 / film', orientation:'landscape', photoOrientation:'portrait', previewClass:'film3',
    w:1800, h:1200, footerTop:.74,
    slots:[
      {x:.055,y:.16,w:.26,h:.46,photo:0},{x:.37,y:.16,w:.26,h:.46,photo:1},{x:.685,y:.16,w:.26,h:.46,photo:2}
    ]
  }
];

const FRAME_STYLES = [
  {id:'feelm-classic', category:'베이직', name:'Feel;m Classic', color:'#1e1b21', textColor:'#fffafc', theme:'clean', brand:'Feel;m'},
  {id:'white-classic', category:'베이직', name:'White Album', color:'#ffffff', textColor:'#2f2932', theme:'clean', brand:'Feel;m'},
  {id:'basic-black', category:'베이직', name:'Black Strip', color:'#29242b', textColor:'#fff7fa', theme:'clean', brand:'our little moment'},
  {id:'pink-bloom', category:'러블리', name:'Pink Bloom', color:'#ffd2e2', textColor:'#493241', theme:'hearts', brand:'our little moment'},
  {id:'lavender-dream', category:'러블리', name:'Lavender Dream', color:'#d9c5f7', textColor:'#433a50', theme:'dots', brand:'Feel;m'},
  {id:'mint-cloud', category:'러블리', name:'Mint Cloud', color:'#cceade', textColor:'#355048', theme:'dots', brand:'momentcut.'},
  {id:'midnight-film', category:'무드', name:'Midnight Film', color:'#201d23', textColor:'#fffaf5', theme:'film', brand:'Feel;m'},
  {id:'retro-check', category:'무드', name:'Retro Checker', color:'#ffecae', textColor:'#463733', theme:'check', brand:'our little moment'},
  {id:'peach-vintage', category:'무드', name:'Peach Vintage', color:'#ffcab9', textColor:'#533f46', theme:'retro', brand:'Feel;m'},
  {id:'sky-bubble', category:'시즌', name:'Sky Bubble', color:'#bfdff6', textColor:'#334048', theme:'hearts', brand:'our little moment'},
  {id:'butter-party', category:'시즌', name:'Butter Party', color:'#ffecae', textColor:'#51463d', theme:'dots', brand:'Celebrate'},
  {id:'winter-letter', category:'시즌', name:'Winter Letter', color:'#ffffff', textColor:'#40505f', theme:'check', brand:'our little moment'}
];

const DEFAULTS = {layoutPreset:'basic4-double', frameStyle:'feelm-classic', timer:3, title:'Feel;m', subtitle:'our little moment'};

const state = {
  layoutPreset:DEFAULTS.layoutPreset, count:4, timer:DEFAULTS.timer, photos:[null,null,null,null], stream:null, busy:false, retakeIndex:null,
  frameStyle:DEFAULTS.frameStyle, color:'#1e1b21', theme:'clean', filter:'none', stickers:[], selectedSticker:null,
  title:DEFAULTS.title, subtitle:DEFAULTS.subtitle, font:'sans', showDate:true, showLogo:true,
  logoUrl:null, date:new Date(), shareUrl:null, page:'home', renderNonce:0, setupDone:false, customFrame:null, availableFrames:[], openFrameCategory:null
};
const photoCache = new Map();
let toastTimer = null;

function toast(message){ui.toast.textContent=message;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),2900)}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function escapeHTML(s){return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function getCurrentPreset(){return LAYOUT_PRESETS.find(x=>x.id===state.layoutPreset)||LAYOUT_PRESETS[0]}
function getCurrentFrameStyle(){return FRAME_STYLES.find(x=>x.id===state.frameStyle)||FRAME_STYLES[0]}
function currentPhotoRatio(){
  const preset=getCurrentPreset(),slot=preset.slots[0];
  return (slot.w*preset.w)/(slot.h*preset.h);
}
function currentPhotoDims(){
  const ratio=currentPhotoRatio();
  const w=ratio>=1?1200:Math.round(1200*ratio),h=ratio>=1?Math.round(1200/ratio):1200;
  return {w,h,ratio:w/h};
}
function blendTextColor(hex){
  const c=hex.replace('#','');if(c.length!==6)return'#2c2630';
  const rgb=[0,2,4].map(i=>parseInt(c.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722<.29?'#fffafa':'#2c2630';
}
function styleInk(){return getCurrentFrameStyle().textColor||blendTextColor(state.color)}
function updateCameraStageMode(){
  const preset=getCurrentPreset();
  const ratio=currentPhotoRatio();
  const portrait=ratio<1;
  ui.stage.style.aspectRatio=String(ratio);
  ui.stage.classList.toggle('portrait',portrait);
  ui.stage.classList.toggle('landscape',!portrait);
  $('.camera-overlay-grid').classList.toggle('portrait',portrait);
}
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
  stopCamera();setLayoutPreset(DEFAULTS.layoutPreset,{preservePhotos:false});state.photos=createDemoPhotos(getCurrentPreset().count);state.retakeIndex=null;state.setupDone=true;
  updateCaptureUI();renderAllOptions();toast('샘플 사진으로 꾸미기를 시작해 볼까요?');go('edit');
});

async function startCamera(){
  updateCameraStageMode();
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
    $('#cameraHelp').textContent='레이아웃에 맞춰 미리보기가 바뀌어요. 촬영된 사진은 기본적으로 브라우저에서만 처리돼요.';
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

function setLayoutPreset(id,{preservePhotos=true}={}){
  const preset=LAYOUT_PRESETS.find(x=>x.id===id);if(!preset)return;
  state.layoutPreset=preset.id;state.count=preset.count;
  state.photos=Array.from({length:preset.count},(_,i)=>preservePhotos?state.photos[i]||null:null);
  if(state.retakeIndex!==null && state.retakeIndex>=preset.count)state.retakeIndex=null;
  if(state.customFrame && state.customFrame.count!==preset.count)state.customFrame=null;
  updateCameraStageMode();renderSetupLayoutOptions();renderSelectedLayoutInfo();renderAdminFrameOptions();updateCaptureUI();updateSetupSummary();
  if(state.page==='edit'||state.page==='result')renderPreview();
}
function applyFrameStyle(styleId,{preserveCustomFrame=false}={}){
  const style=FRAME_STYLES.find(x=>x.id===styleId)||FRAME_STYLES[0];
  state.frameStyle=style.id;state.color=style.color;state.theme=style.theme;
  $('#customFrameColor').value=state.color;
  if(!preserveCustomFrame)state.customFrame=null;
  renderBuiltinFrameOptions();renderThemeOptions();renderColorOptions();renderAdminFrameOptions();renderPreview();
}
function setTimer(n){
  state.timer=n;$$('#timerSelector button').forEach(b=>b.classList.toggle('selected',Number(b.dataset.timer)===n));
  $('#modeHint').textContent=n===0?'✧ 셔터를 누를 때마다 한 컷씩 촬영해요. 원하는 타이밍에 찰칵!':`✧ 레이아웃을 먼저 고른 뒤 셔터를 누르면 ${n}초 카운트다운 후 촬영해요. 남은 컷도 자동으로 찍어요.`;
  updateCaptureUI();updateSetupSummary();
}
$$('#timerSelector button').forEach(b=>b.addEventListener('click',()=>setTimer(Number(b.dataset.timer))));
function updateSetupSummary(){
  const preset=getCurrentPreset();
  const description=`${preset.name} · ${preset.count}컷 · ${state.timer===0?'직접 촬영':state.timer+'초 자동 촬영'}`;
  $('#setupSummary').textContent=description;
  $('#captureSettingsSummary').textContent=`${preset.name} / ${preset.badge} / ${state.timer===0?'수동':state.timer+'초 자동'}`;
}
$('#beginCaptureBtn').addEventListener('click',()=>{state.setupDone=true;go('capture')});
$('#backToSetupBtn').addEventListener('click',()=>go('setup'));

function fullReset(){
  if(state.busy){toast('촬영이 끝난 후 초기화할 수 있어요.');return}
  if(!window.confirm('촬영한 모든 사진과 꾸미기 설정을 지우고 처음부터 다시 시작할까요?'))return;
  stopCamera();photoCache.clear();state.renderNonce++;
  Object.assign(state,{openFrameCategory:null,timer:DEFAULTS.timer,photos:[null,null,null,null],retakeIndex:null,setupDone:false,shareUrl:null,date:new Date(),customFrame:null,stickers:[],selectedSticker:null,logoUrl:null,showDate:true,showLogo:true,filter:'none',font:'sans'});
  setLayoutPreset(DEFAULTS.layoutPreset,{preservePhotos:false});
  const old=$('#finalImage').dataset.objectUrl;if(old)URL.revokeObjectURL(old);
  $('#finalImage').removeAttribute('src');delete $('#finalImage').dataset.objectUrl;
  $('#shareBox').classList.add('hidden');$('#shareStatus').textContent='';$('#shareLink').value='';
  $('#countdown').classList.add('hidden');$('#photoUpload').value='';resetStyle();setTimer(DEFAULTS.timer);go('setup');toast('사진과 설정을 모두 초기화했어요.');
}
['fullResetCaptureBtn','fullResetEditBtn','fullResetResultBtn','fullResetSetupBtn'].forEach(id=>$('#'+id).addEventListener('click',fullReset));

function updateCaptureUI(){
  const filled=state.photos.filter(Boolean).length;
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
  const dims=currentPhotoDims();
  const cvs=document.createElement('canvas');cvs.width=dims.w;cvs.height=dims.h;
  const ctx=cvs.getContext('2d');const vw=ui.video.videoWidth,vh=ui.video.videoHeight;
  const sourceRatio=vw/vh,targetRatio=dims.ratio;
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
    try{const data=await resizeImageFile(f);state.photos[slots.shift()]=data}catch{toast(`${f.name}: 이미지 파일을 열지 못했어요.`)}
  }
  state.retakeIndex=null;state.shareUrl=null;updateCaptureUI();e.target.value='';
  if(state.photos.every(Boolean))toast('사진을 모두 채웠어요. 이제 꾸며봐요!');
});
async function resizeImageFile(file){
  const url=URL.createObjectURL(file), dims=currentPhotoDims();
  try{const img=await loadImage(url);const c=document.createElement('canvas');c.width=dims.w;c.height=dims.h;const ctx=c.getContext('2d');drawCover(ctx,img,0,0,dims.w,dims.h);return c.toDataURL('image/jpeg',.91)}
  finally{URL.revokeObjectURL(url)}
}
function loadImage(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('이미지를 열 수 없음'));img.src=src})}
function drawCover(ctx,img,x,y,w,h){const r=Math.max(w/img.width,h/img.height),sw=w/r,sh=h/r;ctx.drawImage(img,(img.width-sw)/2,(img.height-sh)/2,sw,sh,x,y,w,h)}
function roundRectPath(ctx,x,y,w,h,r){const rr=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+rr,y);ctx.arcTo(x+w,y,x+w,y+h,rr);ctx.arcTo(x+w,y+h,x,y+h,rr);ctx.arcTo(x,y+h,x,y,rr);ctx.arcTo(x,y,x+w,y,rr);ctx.closePath()}

function renderSetupLayoutOptions(){
  $('#setupLayoutOptions').innerHTML=LAYOUT_PRESETS.map(p=>`<button class="setup-layout-card ${state.layoutPreset===p.id?'selected':''}" data-setup-layout="${p.id}" aria-pressed="${state.layoutPreset===p.id}"><div class="setup-layout-top"><div><strong>${escapeHTML(p.name)}</strong><small>${escapeHTML(p.note)}</small></div><div class="layout-mini ${p.previewClass}">${Array.from({length:Math.max(p.count,p.id==='basic4-double'?8:p.count)},()=>'<b></b>').join('')}</div></div><div class="setup-layout-meta"><span>${p.count}컷</span><span>${p.badge}</span><span>${(p.slots[0].w*p.w)/(p.slots[0].h*p.h)<1?'세로 사진':'가로 사진'}</span></div></button>`).join('');
  $$('[data-setup-layout]').forEach(b=>b.addEventListener('click',()=>setLayoutPreset(b.dataset.setupLayout)));
}
function renderSelectedLayoutInfo(){
  const p=getCurrentPreset();
  $('#layoutOptions').innerHTML=`<div class="layout-opt locked selected" aria-pressed="true"><span class="layout-drawing" style="grid-template-columns:repeat(${p.id==='basic4-double'?2:(p.id==='film3'?3:(p.count===6?2:2))},1fr);grid-template-rows:${p.id==='basic4-double'?'repeat(4,1fr)':p.id==='film3'?'1fr':p.id==='basic6-grid'?'repeat(3,1fr)':'repeat(2,1fr)'}">${Array.from({length:p.id==='basic4-double'?8:p.count},()=>'<b></b>').join('')}</span>${escapeHTML(p.name)}<small>${escapeHTML(p.note)}</small></div>`;
}
function renderBuiltinFrameOptions(){
  const groups={};
  FRAME_STYLES.forEach(style=>{(groups[style.category]??=[]).push(style)});
  const preset=getCurrentPreset();
  const target=$('#builtinFrameOptions');
  // Native <details> supports mouse, touch and keyboard; only one category stays expanded.
  target.innerHTML=Object.entries(groups).map(([category,items])=>`<details class="frame-category" data-frame-category="${escapeHTML(category)}" ${state.openFrameCategory===category?'open':''}><summary class="frame-category-toggle"><span class="frame-category-label">${escapeHTML(category)} <small>${items.length}개 프레임</small></span><span class="frame-category-chevron" aria-hidden="true">⌄</span></summary><div class="frame-category-content"><div class="builtin-frame-grid">${items.map(style=>`<button class="builtin-frame-card ${state.frameStyle===style.id&&!state.customFrame?'selected':''}" data-built-style="${style.id}" aria-pressed="${state.frameStyle===style.id&&!state.customFrame}"><div class="builtin-frame-preview preview-${preset.id==='basic4-double'?'basic4':preset.id==='basic6-grid'?'basic6':preset.id==='wide4'?'wide4':preset.id==='layer4'?'layer4':'film3'}" style="background:${style.color}">${Array.from({length:preset.id==='basic4-double'?8:preset.count},()=>'<span class="cell"></span>').join('')}</div><strong>${escapeHTML(style.name)}</strong><small>${escapeHTML(style.brand)} · ${escapeHTML(style.note||category)}</small></button>`).join('')}</div></div></details>`).join('');
  $$('details[data-frame-category]',target).forEach(details=>details.addEventListener('toggle',()=>{
    if(!details.isConnected)return;
    const category=details.dataset.frameCategory;
    if(details.open){
      state.openFrameCategory=category;
      $$('details[data-frame-category]',target).forEach(other=>{if(other!==details)other.open=false});
    }else if(state.openFrameCategory===category){state.openFrameCategory=null}
  }));
  $$('[data-built-style]',target).forEach(b=>b.addEventListener('click',()=>applyFrameStyle(b.dataset.builtStyle)));
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
$('#removeStickerBtn').addEventListener('click',()=>{state.stickers=state.stickers.filter(s=>s.id!==state.selectedSticker);state.selectedSticker=null;$('#removeStickerBtn').disabled=true;renderPreview()});
$('#clearStickersBtn').addEventListener('click',()=>{state.stickers=[];state.selectedSticker=null;$('#removeStickerBtn').disabled=true;renderPreview()});
[['printTitle','title'],['printSubtitle','subtitle']].forEach(([id,key])=>$('#'+id).addEventListener('input',e=>{state[key]=e.target.value;renderPreview()}));
$$('#fontSelector button').forEach(b=>b.addEventListener('click',()=>{state.font=b.dataset.font;$$('#fontSelector button').forEach(c=>c.classList.toggle('selected',c===b));renderPreview();}));
$('#showDate').addEventListener('change',e=>{state.showDate=e.target.checked;renderPreview()});
$('#showLogo').addEventListener('change',e=>{state.showLogo=e.target.checked;renderPreview()});
$('#logoUpload').addEventListener('change',async e=>{
  const f=e.target.files?.[0];if(!f)return;
  if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(f.type)||f.size>3*1024*1024){toast('3MB 이하 PNG, JPG, WEBP, SVG 로고만 올려주세요.');return}
  try{const src=await new Promise((resolve,reject)=>{let r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});await loadImage(src);state.logoUrl=src;$('#logoFileName').textContent=f.name;$('#clearLogoBtn').classList.remove('hidden');renderPreview();}
  catch{toast('로고 이미지를 확인해 주세요.')}e.target.value='';
});
$('#clearLogoBtn').addEventListener('click',()=>{state.logoUrl=null;$('#clearLogoBtn').classList.add('hidden');$('#logoFileName').textContent='투명 배경 PNG를 추천해요.';renderPreview()});
function resetStyle(){
  state.customFrame=null;state.filter='none';state.stickers=[];state.selectedSticker=null;state.title=DEFAULTS.title;state.subtitle=DEFAULTS.subtitle;state.font='sans';state.showDate=true;state.showLogo=true;state.logoUrl=null;
  applyFrameStyle(DEFAULTS.frameStyle,{preserveCustomFrame:true});
  $('#printTitle').value=state.title;$('#printSubtitle').value=state.subtitle;$('#showDate').checked=true;$('#showLogo').checked=true;
  $('#customFrameColor').value=state.color;$('#clearLogoBtn').classList.add('hidden');$('#logoFileName').textContent='투명 배경 PNG를 추천해요.';
  $$('#fontSelector button').forEach(b=>b.classList.toggle('selected',b.dataset.font===state.font));$('#removeStickerBtn').disabled=true;
  renderAllOptions();renderPreview();
}
$('#resetStyleBtn').addEventListener('click',()=>{resetStyle();toast('꾸미기 설정을 초기화했어요.')});
$('#shuffleStyleBtn').addEventListener('click',()=>{const style=FRAME_STYLES[Math.floor(Math.random()*FRAME_STYLES.length)];state.filter=FILTERS[Math.floor(Math.random()*FILTERS.length)][0];applyFrameStyle(style.id)});
function renderAllOptions(){renderSelectedLayoutInfo();renderBuiltinFrameOptions();renderThemeOptions();renderColorOptions();renderFilterOptions();renderStickerOptions()}

async function loadAdminFrames(){
  try{
    const response=await fetch('/api/frames',{cache:'no-store'});
    if(!response.ok)throw Error('관리자 프레임 서버가 아직 준비되지 않았어요.');
    const data=await response.json();state.availableFrames=Array.isArray(data.frames)?data.frames:[];
    if(state.customFrame){const newer=state.availableFrames.find(f=>f.id===state.customFrame.id);if(newer)state.customFrame=newer;}
    renderAdminFrameOptions();
  }catch{$('#adminFrameOptions').innerHTML='<p class="small-note">관리자 프레임을 불러올 수 없어요. 기본 프레임은 이용할 수 있어요.</p>';}
}
function renderAdminFrameOptions(){
  const options=(state.availableFrames||[]).filter(f=>f.count===state.count);
  $('#clearAdminFrameBtn').classList.toggle('hidden',!state.customFrame);
  if(!options.length){$('#adminFrameOptions').innerHTML='<p class="small-note">이 컷 수에 등록된 특별 프레임이 아직 없어요.</p>';return}
  $('#adminFrameOptions').innerHTML=options.map(frame=>`<button class="community-frame ${state.customFrame?.id===frame.id?'selected':''}" data-special-frame="${frame.id}" aria-pressed="${state.customFrame?.id===frame.id}">${frame.imageKey?`<img src="/api/frame-image?id=${encodeURIComponent(frame.id)}&v=${encodeURIComponent(frame.updatedAt)}" alt="">`:'<span class="frame-placeholder">✿</span>'}<strong>${escapeHTML(frame.name)}</strong><small>${frame.count}컷 전용</small></button>`).join('');
  $$('[data-special-frame]').forEach(b=>b.addEventListener('click',()=>{
    const frame=options.find(f=>f.id===b.dataset.specialFrame);if(!frame)return;
    state.customFrame=frame;state.color=frame.color;state.title=frame.title;state.subtitle=frame.subtitle;
    $('#printTitle').value=state.title;$('#printSubtitle').value=state.subtitle;$('#customFrameColor').value=state.color;
    renderSelectedLayoutInfo();renderBuiltinFrameOptions();renderAdminFrameOptions();renderPreview();toast(`${frame.name} 프레임을 선택했어요!`);
  }));
}
$('#clearAdminFrameBtn').addEventListener('click',()=>{state.customFrame=null;renderAdminFrameOptions();renderPreview()});

function makeFramePattern(ctx,g,ink){
  const {w,h,theme}= {...g,theme:state.theme};
  ctx.save();ctx.globalAlpha=.48;ctx.strokeStyle=ink;ctx.fillStyle=ink;
  if(theme==='dots'){
    for(let y=28;y<h-20;y+=38){for(let x=25;x<w-20;x+=38){if((x<g.innerLeft-14||x>w-g.innerLeft+14||y<g.innerTop-25||y>g.innerBottom+25)){ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}}}
  }else if(theme==='check'){
    ctx.globalAlpha=.13;let step=32;for(let y=0;y<h;y+=step){for(let x=0;x<w;x+=step){if(((x/step+y/step)&1)===0)ctx.fillRect(x,y,step,step)}}
  }else if(theme==='hearts'){
    ctx.font='26px serif';for(let y=45;y<h-10;y+=145){ctx.fillText('♡',14,y);ctx.fillText('♡',w-43,y)}
  }else if(theme==='retro'){
    ctx.font='bold 33px serif';for(let y=38;y<h;y+=125){ctx.fillText('✳',8,y);ctx.fillText('✧',w-42,y+50)}
  }else if(theme==='film'){
    ctx.globalAlpha=.4;for(let y=15;y<h-8;y+=52){ctx.fillRect(12,y,25,31);ctx.fillRect(w-37,y,25,31)}
    for(let x=58;x<w-45;x+=66){ctx.fillRect(x,14,32,24);ctx.fillRect(x,h-38,32,24)}
  }
  ctx.restore();
}
function fitText(ctx,text,maxWidth,size,minSize=15){let x=size;while(ctx.measureText(text).width>maxWidth&&x>minSize){x-=2;ctx.font=ctx.font.replace(/\d+(?=px)/,String(x))}return x}

async function renderAdminCustomFrame(req){
  const frame=state.customFrame;if(!frame)return;
  const imgs=await Promise.all(state.photos.slice(0,state.count).map(async src=>{if(!src)return null;if(photoCache.has(src))return photoCache.get(src);try{const im=await loadImage(src);photoCache.set(src,im);return im}catch{return null}}));
  let overlay=null,logo=null;if(frame.imageKey){try{overlay=await loadImage(`/api/frame-image?id=${encodeURIComponent(frame.id)}&v=${encodeURIComponent(frame.updatedAt)}`)}catch{}}
  if(state.logoUrl){try{logo=await loadImage(state.logoUrl)}catch{}}
  if(req!==state.renderNonce)return;
  const canvas=ui.canvas;canvas.width=frame.width;canvas.height=frame.height;const ctx=canvas.getContext('2d');ctx.fillStyle=frame.color;ctx.fillRect(0,0,frame.width,frame.height);
  const filter=FILTERS.find(x=>x[0]===state.filter)?.[2]||'none';
  frame.slots.forEach((slot,i)=>{const x=slot.x*frame.width,y=slot.y*frame.height,w=slot.w*frame.width,h=slot.h*frame.height;ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();if(imgs[i]){ctx.filter=filter;drawCover(ctx,imgs[i],x,y,w,h);ctx.filter='none'}else{ctx.fillStyle='#f0ddeb';ctx.fillRect(x,y,w,h);ctx.fillStyle='#9b82a2';ctx.textAlign='center';ctx.font=`bold ${Math.max(13,Math.min(w*.09,46))}px Arial`;ctx.fillText(`PHOTO ${i+1}`,x+w/2,y+h/2)}ctx.restore()});
  if(overlay)ctx.drawImage(overlay,0,0,frame.width,frame.height);
  ctx.fillStyle=frame.textColor;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`bold ${frame.titleSize}px ${state.font==='serif'?'Georgia,serif':state.font==='hand'?'cursive':'Arial,sans-serif'}`;
  fitText(ctx,state.title.trim(),frame.width*.9,frame.titleSize,14);if(state.title.trim())ctx.fillText(state.title.trim(),frame.width/2,frame.height*frame.titleY);
  ctx.font=`${Math.max(13,Math.round(frame.titleSize*.53))}px Arial,sans-serif`;fitText(ctx,state.subtitle.trim(),frame.width*.9,Math.max(13,Math.round(frame.titleSize*.53)),12);if(state.subtitle.trim())ctx.fillText(state.subtitle.trim(),frame.width/2,frame.height*frame.subtitleY);
  if(state.showDate){const d=state.date;ctx.font=`${Math.max(12,Math.round(frame.width*.019))}px Arial,sans-serif`;ctx.fillText(`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`,frame.width/2,frame.height*.978)}
  if(state.showLogo){ctx.save();ctx.textAlign='right';ctx.font=`bold ${Math.max(13,Math.round(frame.width*.023))}px Arial`;ctx.fillText('Feel;m',frame.width*.965,frame.height*.025);ctx.restore()}
  if(logo){const scale=Math.min(frame.width*.15/logo.width,frame.height*.08/logo.height);ctx.drawImage(logo,frame.width*.82,frame.height*.9,logo.width*scale,logo.height*scale)}
  for(const sticker of state.stickers){const x=sticker.x*frame.width,y=sticker.y*frame.height,size=Math.round(frame.width*.065);ctx.save();ctx.font=`${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sticker.emoji,x,y);ctx.restore();if(sticker.id===state.selectedSticker&&state.page==='edit'){ctx.save();ctx.setLineDash([9,7]);ctx.strokeStyle='#9c60d8';ctx.lineWidth=3;ctx.strokeRect(x-size*.6,y-size*.6,size*1.2,size*1.2);ctx.restore()}}
}
function drawPhotoSlot(ctx,img,x,y,w,h,filter,index,radius=18){
  ctx.save();roundRectPath(ctx,x,y,w,h,radius);ctx.clip();
  if(img){ctx.filter=filter;drawCover(ctx,img,x,y,w,h);ctx.filter='none'}
  else{const grd=ctx.createLinearGradient(x,y,x+w,y+h);grd.addColorStop(0,'#f5e0ea');grd.addColorStop(1,'#ded4f3');ctx.fillStyle=grd;ctx.fillRect(x,y,w,h);ctx.fillStyle='#a795af';ctx.font=`900 ${Math.round(Math.min(w,h)*.18)}px Arial`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('✧',x+w/2,y+h/2-20);ctx.font=`bold ${Math.round(Math.min(w,h)*.11)}px Arial`;ctx.fillText(`PHOTO ${String(index+1).padStart(2,'0')}`,x+w/2,y+h/2+22)}
  ctx.restore();
  ctx.save();ctx.lineWidth=3;ctx.strokeStyle='rgba(255,255,255,.85)';roundRectPath(ctx,x,y,w,h,radius);ctx.stroke();ctx.restore();
}
async function renderPreview(){
  if(state.customFrame){const req=++state.renderNonce;return renderAdminCustomFrame(req)}
  const req=++state.renderNonce;const preset=getCurrentPreset();const style=getCurrentFrameStyle();const canvas=ui.canvas;
  const resources=await Promise.all(state.photos.slice(0,state.count).map(async src=>{if(!src)return null;if(photoCache.has(src))return photoCache.get(src);try{const image=await loadImage(src);photoCache.set(src,image);if(photoCache.size>18)photoCache.delete(photoCache.keys().next().value);return image}catch{return null}}));
  let logo=null;if(state.logoUrl){try{logo=await loadImage(state.logoUrl)}catch{}}
  if(req!==state.renderNonce)return;
  canvas.width=preset.w;canvas.height=preset.h;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,preset.w,preset.h);
  const ink=styleInk();ctx.fillStyle=state.color;ctx.fillRect(0,0,preset.w,preset.h);
  const allX=preset.slots.flatMap(s=>[s.x*preset.w,(s.x+s.w)*preset.w]),allY=preset.slots.flatMap(s=>[s.y*preset.h,(s.y+s.h)*preset.h]);
  const geometry={w:preset.w,h:preset.h,innerLeft:Math.min(...allX),innerTop:Math.min(...allY),innerBottom:Math.max(...allY)};makeFramePattern(ctx,geometry,ink);

  const isDoubleFour=preset.id==='basic4-double';
  if(!isDoubleFour){
    if(state.theme==='film' || preset.id==='film3'){
      ctx.fillStyle=ink;ctx.globalAlpha=.18;ctx.fillRect(30,26,preset.w-60,10);ctx.fillRect(30,preset.h-36,preset.w-60,10);ctx.globalAlpha=1;
    }
    ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.font=`900 ${preset.orientation==='portrait'?28:30}px Arial,sans-serif`;
    if(state.showLogo)ctx.fillText(style.brand,preset.w/2,55);
  }

  const filter=FILTERS.find(f=>f[0]===state.filter)?.[2]||'none';
  preset.slots.forEach(slot=>{
    const x=slot.x*preset.w,y=slot.y*preset.h,w=slot.w*preset.w,h=slot.h*preset.h;
    drawPhotoSlot(ctx,resources[slot.photo]||null,x,y,w,h,filter,slot.photo,isDoubleFour?2:18);
  });

  const title=state.title.trim()||DEFAULTS.title;
  const subtitle=state.subtitle.trim();
  const d=state.date;
  const dateText=`${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
  ctx.fillStyle=ink;ctx.textAlign='center';ctx.textBaseline='middle';
  if(isDoubleFour){
    // Two 2x6 strips. Each gets its own complete footer, just like a cut-to-share print.
    for(const centerX of [preset.w*.25,preset.w*.75]){
      ctx.globalAlpha=1;
      ctx.font=state.font==='serif'?'700 48px Georgia,serif':state.font==='hand'?'italic 700 48px cursive':'900 48px Arial,sans-serif';
      fitText(ctx,title,preset.w*.42,48,26);
      ctx.fillText(title,centerX,preset.h*.901);
      if(subtitle){
        ctx.globalAlpha=.85;ctx.font=state.font==='serif'?'21px Georgia,serif':'20px Arial,sans-serif';
        fitText(ctx,subtitle,preset.w*.42,20,14);ctx.fillText(subtitle,centerX,preset.h*.939);
      }
      if(state.showDate){
        ctx.globalAlpha=.67;ctx.font='17px Arial,sans-serif';ctx.fillText(dateText,centerX,preset.h*.965);
      }
    }
    ctx.globalAlpha=1;
    // Thin center cutting line only; no empty sheet-wide footer or layout name.
    ctx.save();ctx.strokeStyle=ink;ctx.globalAlpha=.25;ctx.lineWidth=2;ctx.setLineDash([7,9]);
    ctx.beginPath();ctx.moveTo(preset.w/2,0);ctx.lineTo(preset.w/2,preset.h);ctx.stroke();ctx.restore();
    if(logo){const scale=Math.min(74/logo.width,45/logo.height);for(const centerX of [preset.w*.25,preset.w*.75])ctx.drawImage(logo,centerX-37,preset.h*.982,logo.width*scale,logo.height*scale)}
  }else{
    const footerTop=preset.footerTop*preset.h;
    ctx.font=state.font==='serif'?'700 39px Georgia,serif':state.font==='hand'?'italic 700 39px cursive':'900 39px Arial,sans-serif';
    fitText(ctx,title,preset.w-160,39,22);ctx.fillText(title,preset.w/2,footerTop+62);
    if(subtitle){ctx.font=state.font==='serif'?'21px Georgia,serif':'20px Arial,sans-serif';ctx.globalAlpha=.86;fitText(ctx,subtitle,preset.w-180,20,13);ctx.fillText(subtitle,preset.w/2,footerTop+110)}
    ctx.globalAlpha=.65;ctx.font='bold 17px Arial,sans-serif';
    if(state.showDate)ctx.fillText(dateText,preset.w/2,footerTop+152);
    ctx.globalAlpha=1;
    if(logo){const maxW=preset.orientation==='portrait'?120:140,maxH=62,scale=Math.min(maxW/logo.width,maxH/logo.height);ctx.drawImage(logo,preset.w-maxW-46,preset.h-90,logo.width*scale,logo.height*scale)}
  }

  for(const sticker of state.stickers){const x=sticker.x*preset.w,y=sticker.y*preset.h,size=Math.round(Math.min(preset.w,preset.h)*.06);ctx.save();ctx.font=`${size}px "Apple Color Emoji","Segoe UI Emoji",sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#43334a55';ctx.shadowBlur=3;ctx.fillText(sticker.emoji,x,y);ctx.restore();if(sticker.id===state.selectedSticker && state.page==='edit'){ctx.save();ctx.setLineDash([9,7]);ctx.lineWidth=3;ctx.strokeStyle='#9c60d8';ctx.strokeRect(x-size*.58,y-size*.59,size*1.16,size*1.18);ctx.restore()}}
  return canvas;
}

let dragging=false;
function pointOnCanvas(event){const rect=ui.canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)/rect.width,y:(event.clientY-rect.top)/rect.height}}
ui.canvas.addEventListener('pointerdown',e=>{
  if(!state.stickers.length)return;const p=pointOnCanvas(e),minDist=.11;let best=null,bestDist=Infinity;
  for(const s of state.stickers){const dx=(p.x-s.x),dy=(p.y-s.y)*(ui.canvas.height/ui.canvas.width);const distance=Math.hypot(dx,dy);if(distance<bestDist){bestDist=distance;best=s}}
  if(best&&bestDist<minDist){state.selectedSticker=best.id;dragging=true;ui.canvas.setPointerCapture(e.pointerId);$('#removeStickerBtn').disabled=false;renderPreview()}
  else{state.selectedSticker=null;$('#removeStickerBtn').disabled=true;renderPreview()}
});
ui.canvas.addEventListener('pointermove',e=>{if(!dragging||!state.selectedSticker)return;const p=pointOnCanvas(e),s=state.stickers.find(x=>x.id===state.selectedSticker);if(s){s.x=Math.max(.03,Math.min(.97,p.x));s.y=Math.max(.03,Math.min(.97,p.y));renderPreview()}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])ui.canvas.addEventListener(name,()=>{dragging=false});

$('#finishBtn').addEventListener('click',()=>go('result'));
async function createFinalBlob(){const oldSelection=state.selectedSticker;state.selectedSticker=null;await renderPreview();const blob=await new Promise(resolve=>ui.canvas.toBlob(resolve,'image/png'));state.selectedSticker=oldSelection;if(state.page==='edit')renderPreview();if(!blob)throw new Error('이미지를 만들 수 없어요.');return blob}
async function showResult(){
  $('#shareBox').classList.add('hidden');$('#shareStatus').textContent='';
  try{const blob=await createFinalBlob();const old=$('#finalImage').dataset.objectUrl;if(old)URL.revokeObjectURL(old);const url=URL.createObjectURL(blob);$('#finalImage').src=url;$('#finalImage').dataset.objectUrl=url;}
  catch{toast('사진 렌더링에 문제가 생겼어요.')}
  state.shareUrl=null;
}
async function downloadPhoto(){
  try{const blob=await createFinalBlob();const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`momentcut_${new Date().toISOString().slice(0,10)}.png`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);toast('고화질 PNG 저장을 시작했어요!')}
  catch{toast('저장에 실패했어요. 다시 시도해 주세요.')}
}
$('#downloadBtn').addEventListener('click',downloadPhoto);
$('#shareFileBtn').addEventListener('click',async()=>{try{const blob=await createFinalBlob(),file=new File([blob],'momentcut.png',{type:'image/png'});if(navigator.share&&(!navigator.canShare||navigator.canShare({files:[file]}))){await navigator.share({title:'모먼트컷 사진 ♡',text:'우리의 오늘을 공유해요!',files:[file]})}else{toast('사진 파일 공유를 지원하지 않는 환경이에요. PNG로 저장해 주세요.')}}catch(err){if(err.name!=='AbortError')toast('공유하지 못했어요. PNG로 저장해 주세요.')}});
$('#createShareBtn').addEventListener('click',async()=>{
  if(state.shareUrl){$('#shareBox').classList.remove('hidden');return}
  const btn=$('#createShareBtn');btn.disabled=true;btn.textContent='QR 생성 중…';$('#shareStatus').textContent='사진을 공유 서버에 올리고 있어요.';
  try{const blob=await createFinalBlob();if(blob.size>10*1024*1024)throw new Error('사진이 너무 커요.');const base64=await new Promise((resolve,reject)=>{let reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});const response=await fetch('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:base64})});if(!response.ok){let message='공유 서버를 사용할 수 없어요.';try{const failure=await response.json();message=failure.error||message}catch{}throw new Error(message)}const data=await response.json();state.shareUrl=new URL(data.url,location.origin).href;$('#qrImage').src=`/api/qr?text=${encodeURIComponent(state.shareUrl)}`;$('#shareLink').value=state.shareUrl;$('#shareBox').classList.remove('hidden');$('#shareStatus').textContent='공유 링크가 만들어졌어요! 7일 동안 열 수 있어요.';}
  catch(err){$('#shareStatus').textContent=err.message||'QR 링크는 서버 실행 및 인터넷에서 접속 가능한 주소가 필요해요.';toast(err.message||'공유 링크를 만들지 못했어요.')}
  finally{btn.disabled=false;btn.textContent='▦ 공유 링크 · QR 만들기'}
});
$('#copyLinkBtn').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#shareLink').value);toast('공유 링크를 복사했어요!')}catch{$('#shareLink').select();document.execCommand('copy');toast('공유 링크를 복사했어요!')}});

function createDemoPhotos(n){
  const arr=[];const tones=[['#ead9f3','#bb99cb','#ffdac7','#533f58'],['#fee6ce','#c997b5','#ffd6b8','#633e3e'],['#d5e9e4','#88b7b1','#f5caae','#4c4244'],['#dfdef8','#a9a4d6','#fcd3ba','#5e4b63'],['#f1d7e0','#d69fae','#eec5ad','#5e4848'],['#fce8ba','#d7aa83','#f4c7a6','#563c40']];
  for(let i=0;i<n;i++){const dims=currentPhotoDims();const c=document.createElement('canvas');c.width=dims.w;c.height=dims.h;const ctx=c.getContext('2d');const [bg,shirt,skin,hair]=tones[i%tones.length];const gradient=ctx.createLinearGradient(0,0,c.width,c.height);gradient.addColorStop(0,bg);gradient.addColorStop(1,'#fff8ef');ctx.fillStyle=gradient;ctx.fillRect(0,0,c.width,c.height);ctx.fillStyle='#fff8';for(let j=0;j<6;j++){ctx.beginPath();ctx.arc((j*203+52)%c.width,(j*149+80)%c.height,20+j*8,0,Math.PI*2);ctx.fill()}ctx.save();ctx.translate(i%2?35:-25,i%3===0?-2:15);ctx.rotate((i-2)*.025);ctx.fillStyle=shirt;ctx.beginPath();ctx.ellipse(c.width*.5,c.height*.92,c.width*.29,c.height*.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(c.width*.5,c.height*.44,c.width*.17,c.height*.2,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=skin;ctx.beginPath();ctx.ellipse(c.width*.5,c.height*.46,c.width*.14,c.height*.15,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=hair;ctx.beginPath();ctx.ellipse(c.width*.476,c.height*.28,c.width*.156,c.height*.08,-.1,Math.PI,Math.PI*2);ctx.fill();ctx.fillStyle='#433338';const eyey=c.height*.46+(i%2)*6;for(let dx of [-c.width*.057,c.width*.057]){ctx.beginPath();ctx.arc(c.width*.5+dx,eyey,7,0,Math.PI*2);ctx.fill()}ctx.lineWidth=5;ctx.strokeStyle='#b76e73';ctx.beginPath();ctx.arc(c.width*.5,c.height*.53,26,.05,Math.PI-.05);ctx.stroke();ctx.fillStyle='#f4a4a663';for(let dx of [-c.width*.083,c.width*.083]){ctx.beginPath();ctx.ellipse(c.width*.5+dx,c.height*.525,27,14,0,0,Math.PI*2);ctx.fill()}ctx.restore();ctx.font='bold 71px serif';ctx.fillStyle='#ffffffaa';ctx.fillText(['✦','♡','✳','✿','★','♡'][i%6],Math.max(40,c.width*.12),Math.max(90,c.height*.12));arr.push(c.toDataURL('image/jpeg',.89))}
  return arr;
}

renderSetupLayoutOptions();setLayoutPreset(DEFAULTS.layoutPreset,{preservePhotos:false});renderAllOptions();updateCaptureUI();updateSetupSummary();resetStyle();
const incoming=location.hash.slice(1);if(['setup','capture','edit','result'].includes(incoming))go(incoming);
