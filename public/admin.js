'use strict';
const $=s=>document.querySelector(s);
const $$=s=>[...document.querySelectorAll(s)];
const state={frames:[],frame:null,selected:0,imageData:null,removeOverlay:false,drag:null,requested:0};
function setStatus(message,bad=false){$('#adminNotice').textContent=message;$('#adminNotice').style.color=bad?'#c04c6a':'#50866f'}
function loginStatus(message){$('#loginError').textContent=message}
async function api(action,options={}){
  const response=await fetch(`/api/admin?action=${encodeURIComponent(action)}`,{credentials:'same-origin',cache:'no-store',...options});
  let result={};try{result=await response.json()}catch{}
  if(!response.ok)throw new Error(result.error||`요청 실패 (${response.status})`);
  return result;
}
function withJSON(body){return{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}}
function defaultSlots(count,layout){
  const portrait=layout==='vertical',cols=portrait?1:2,rows=Math.ceil(count/cols);
  const marginX=portrait?.1:.09,gapX=portrait?0:.025,top=portrait?.09:.11,bottom=portrait?.88:.86,gapY=portrait?.012:.016;
  const cellW=(1-marginX*2-gapX*(cols-1))/cols;
  const cellH=(bottom-top-gapY*(rows-1))/rows;
  return Array.from({length:count},(_,i)=>({x:+(marginX+(i%cols)*(cellW+gapX)).toFixed(4),y:+(top+Math.floor(i/cols)*(cellH+gapY)).toFixed(4),w:+cellW.toFixed(4),h:+cellH.toFixed(4)}));
}
function shape(count,layout){if(layout==='vertical')return count===4?[900,2600]:[900,3500];return count===4?[1200,1500]:[1200,1950]}
function freshFrame(){const count=4,orientation='vertical',[width,height]=shape(count,orientation);return{id:crypto.randomUUID(),name:'새 네컷 프레임',count,orientation,width,height,color:'#f5d5e9',textColor:'#3b3047',title:'our little moment ♡',subtitle:'오늘의 우리를 기억해',titleSize:37,titleY:.945,subtitleY:.965,slots:defaultSlots(count,orientation),imageKey:null}}
function controlIds(){return ['frameName','frameCount','frameOrientation','frameWidth','frameHeight','frameColor','textColor','frameTitle','frameSubtitle','titleSize','titleY','subtitleY']}
function fillForm(){const f=state.frame;if(!f)return;
  $('#frameName').value=f.name;$('#frameCount').value=f.count;$('#frameOrientation').value=f.orientation||'vertical';
  $('#frameWidth').value=f.width;$('#frameHeight').value=f.height;$('#frameColor').value=f.color;$('#textColor').value=f.textColor;
  $('#frameTitle').value=f.title;$('#frameSubtitle').value=f.subtitle;$('#titleSize').value=f.titleSize;
  $('#titleY').value=Math.round(f.titleY*100);$('#subtitleY').value=Math.round(f.subtitleY*100);
  $('#overlayInfo').textContent=state.imageData?'새 이미지 선택됨':f.imageKey?'프레임 이미지 등록됨':'등록된 이미지 없음';
  $('#deleteFrameBtn').disabled=!state.frames.some(x=>x.id===f.id);
  renderList();renderSlots();renderStage();setStatus('');
}
function newFrame(){state.frame=freshFrame();state.selected=0;state.imageData=null;state.removeOverlay=false;fillForm()}
function chooseFrame(id){const f=state.frames.find(x=>x.id===id);if(!f)return;state.frame=structuredClone(f);state.selected=0;state.imageData=null;state.removeOverlay=false;fillForm()}
function renderList(){const list=$('#frameList');list.replaceChildren();
  if(!state.frames.length){const p=document.createElement('p');p.className='hint';p.textContent='등록된 프레임이 없어요. 새 프레임을 만들어 보세요.';list.append(p)}
  for(const f of state.frames){const btn=document.createElement('button');btn.className='frame-entry'+(state.frame?.id===f.id?' selected':'');const strong=document.createElement('strong');strong.textContent=f.name;const small=document.createElement('small');small.textContent=`${f.count}컷 · ${f.width}×${f.height}`;btn.append(strong,small);btn.addEventListener('click',()=>chooseFrame(f.id));list.append(btn)}
}
function renderSlots(){const wrap=$('#slotButtons');wrap.replaceChildren();state.frame.slots.forEach((_,i)=>{const btn=document.createElement('button');btn.textContent=`${i+1}번`;btn.classList.toggle('selected',i===state.selected);btn.addEventListener('click',()=>{state.selected=i;renderSlots();renderStage()});wrap.append(btn)});syncSlotInputs()}
function syncSlotInputs(){const slot=state.frame.slots[state.selected];if(!slot)return;for(const [key,id] of [['x','slotX'],['y','slotY'],['w','slotW'],['h','slotH']])$('#'+id).value=+(slot[key]*100).toFixed(1)}
const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
function updateSlotStyle(){const slots=$$('.stage-slot');state.frame.slots.forEach((s,i)=>{const el=slots[i];if(!el)return;Object.assign(el.style,{left:(s.x*100)+'%',top:(s.y*100)+'%',width:(s.w*100)+'%',height:(s.h*100)+'%'})});syncSlotInputs()}
function beginDrag(event,i,resize=false){if(event.button!==0)return;event.preventDefault();state.selected=i;renderSlots();$$('.stage-slot').forEach((el,idx)=>el.classList.toggle('selected',idx===i));
  const original={...state.frame.slots[i]};state.drag={id:event.pointerId,index:i,resize,original,startX:event.clientX,startY:event.clientY};
  event.currentTarget.setPointerCapture(event.pointerId);
}
function moveDrag(event){const d=state.drag;if(!d||d.id!==event.pointerId)return;const rect=$('#frameStage').getBoundingClientRect();const dx=(event.clientX-d.startX)/rect.width,dy=(event.clientY-d.startY)/rect.height;
  const s=state.frame.slots[d.index];if(d.resize){s.w=clamp(d.original.w+dx,.05,1-s.x);s.h=clamp(d.original.h+dy,.04,1-s.y)}
  else{s.x=clamp(d.original.x+dx,0,1-s.w);s.y=clamp(d.original.y+dy,0,1-s.h)}
  for(const k of ['x','y','w','h'])s[k]=+s[k].toFixed(4);updateSlotStyle();
}
function renderStage(){const f=state.frame,stage=$('#frameStage');if(!f)return;stage.replaceChildren();
  stage.style.aspectRatio=`${f.width}/${f.height}`;stage.style.maxHeight='none';stage.style.width=`${Math.min(360,Math.max(160,$('.preview-surface').clientWidth-44),700*f.width/f.height)}px`;stage.style.background=f.color;
  f.slots.forEach((slot,i)=>{const el=document.createElement('div');el.className='stage-slot'+(i===state.selected?' selected':'');el.dataset.index=i;
    const mark=document.createElement('i');mark.textContent=`PHOTO ${i+1}`;const handle=document.createElement('span');handle.className='handle';
    el.append(mark,handle);el.addEventListener('pointerdown',e=>beginDrag(e,i,e.target===handle));el.addEventListener('pointermove',moveDrag);el.addEventListener('pointerup',()=>{state.drag=null});el.addEventListener('pointercancel',()=>{state.drag=null});stage.append(el)});
  if(state.imageData||f.imageKey&&!state.removeOverlay){const img=new Image();img.className='stage-overlay';img.alt='';img.src=state.imageData||`/api/frame-image?id=${encodeURIComponent(f.id)}&v=${encodeURIComponent(f.updatedAt||'0')}`;stage.append(img)}
  for(const [text,key,y,size] of [[f.title,'title',f.titleY,f.titleSize],[f.subtitle,'subtitle',f.subtitleY,f.titleSize*.55]]){
    if(!text)continue;const el=document.createElement('span');el.className='stage-text';el.textContent=text;el.style.top=(y*100)+'%';el.style.color=f.textColor;
    // Correct scale will be set after layout by ResizeObserver.
    el.dataset.size=String(size);stage.append(el)}
  const date=document.createElement('span');date.className='stage-date';date.textContent='momentcut · 날짜';stage.append(date);
  updateSlotStyle();scaleText();
}
function scaleText(){const f=state.frame;if(!f)return;const width=$('#frameStage').getBoundingClientRect().width;$$('#frameStage .stage-text').forEach(el=>el.style.fontSize=Math.max(7,Number(el.dataset.size)*width/f.width)+'px')}
new ResizeObserver(()=>scaleText()).observe($('#frameStage'));
$('#loginForm').addEventListener('submit',async e=>{e.preventDefault();loginStatus('로그인 중…');try{await api('login',withJSON({password:$('#adminPassword').value}));$('#adminPassword').value='';await boot();}catch(err){loginStatus(err.message)}});
$('#logoutBtn').addEventListener('click',async()=>{await api('logout',{method:'POST'}).catch(()=>{});$('#adminWorkspace').classList.add('hidden');$('#loginPanel').classList.remove('hidden');loginStatus('로그아웃했어요.')});
$('#newFrameBtn').addEventListener('click',newFrame);
$('#frameName').addEventListener('input',e=>{state.frame.name=e.target.value;renderList()});
$('#frameCount').addEventListener('change',()=>{const f=state.frame;f.count=Number($('#frameCount').value);f.slots=defaultSlots(f.count,$('#frameOrientation').value);const [w,h]=shape(f.count,$('#frameOrientation').value);f.width=w;f.height=h;state.selected=0;fillForm()});
$('#frameOrientation').addEventListener('change',()=>{const f=state.frame;f.orientation=$('#frameOrientation').value;f.slots=defaultSlots(f.count,f.orientation);[f.width,f.height]=shape(f.count,f.orientation);state.selected=0;fillForm()});
for(const [field,key,type] of [['frameWidth','width','number'],['frameHeight','height','number'],['frameColor','color','text'],['textColor','textColor','text'],['frameTitle','title','text'],['frameSubtitle','subtitle','text'],['titleSize','titleSize','number']]){
  $('#'+field).addEventListener('input',e=>{state.frame[key]=type==='number'?Number(e.target.value):e.target.value;renderStage()})}
for(const [field,key] of [['titleY','titleY'],['subtitleY','subtitleY']])$('#'+field).addEventListener('input',e=>{state.frame[key]=clamp(Number(e.target.value)/100,0,1);renderStage()});
for(const [id,key] of [['slotX','x'],['slotY','y'],['slotW','w'],['slotH','h']])$('#'+id).addEventListener('change',e=>{
  const s=state.frame.slots[state.selected],v=clamp(Number(e.target.value)/100,0,1);
  if(key==='x')s.x=clamp(v,0,1-s.w);if(key==='y')s.y=clamp(v,0,1-s.h);
  if(key==='w')s.w=clamp(v,.05,1-s.x);if(key==='h')s.h=clamp(v,.04,1-s.y);
  renderStage();
});
$('#autoSlotsBtn').addEventListener('click',()=>{state.frame.slots=defaultSlots(state.frame.count,$('#frameOrientation').value);state.selected=0;renderSlots();renderStage()});
$('#removeImageBtn').addEventListener('click',()=>{state.imageData=null;state.removeOverlay=true;$('#frameImage').value='';$('#overlayInfo').textContent='이미지 제거 예정 — 저장하면 반영돼요';renderStage()});
$('#frameImage').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)){setStatus('PNG, JPG, WEBP 이미지 파일을 선택해 주세요.',true);return}
  try{const src=URL.createObjectURL(file);const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=src});
    URL.revokeObjectURL(src);const ratio=Math.min(1,1200/state.frame.width,2800/state.frame.height);
    const c=document.createElement('canvas');c.width=Math.round(state.frame.width*ratio);c.height=Math.round(state.frame.height*ratio);c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    const converted=await new Promise(resolve=>c.toBlob(resolve,'image/webp',.84));if(!converted||converted.size>1_500_000)throw new Error('이미지 크기를 줄여 주세요. 프레임 이미지는 1.5MB 이하를 지원해요.');
    state.imageData=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsDataURL(converted)});
    state.removeOverlay=false;$('#overlayInfo').textContent=`${file.name} · ${(converted.size/1024).toFixed(0)}KB (WEBP로 최적화)`;renderStage();setStatus('이미지를 선택했어요. 저장 버튼을 눌러 공개해 주세요.');
  }catch(err){setStatus(err.message||'이미지를 읽지 못했어요.',true)}
});
$('#saveFrameBtn').addEventListener('click',async()=>{
  const btn=$('#saveFrameBtn');btn.disabled=true;setStatus('저장 중이에요…');
  try{const {frame}=await api('save',withJSON({frame:state.frame,imageData:state.imageData,removeOverlay:state.removeOverlay}));
    const i=state.frames.findIndex(f=>f.id===frame.id);if(i<0)state.frames.unshift(frame);else state.frames[i]=frame;
    state.frame=structuredClone(frame);state.imageData=null;state.removeOverlay=false;fillForm();setStatus('저장 완료! 일반 사이트의 프레임 목록에 공개됐어요.');
  }catch(err){setStatus(err.message,true)}finally{btn.disabled=false}
});
$('#deleteFrameBtn').addEventListener('click',async()=>{
  if(!confirm(`'${state.frame.name}' 프레임을 삭제할까요? 일반 사이트에서도 사라져요.`))return;
  try{await api('delete',withJSON({id:state.frame.id}));state.frames=state.frames.filter(f=>f.id!==state.frame.id);newFrame();setStatus('프레임을 삭제했어요.');}catch(err){setStatus(err.message,true)}
});
async function boot(){
  $('#loginPanel').classList.add('hidden');$('#adminWorkspace').classList.remove('hidden');
  try{const data=await api('list');state.frames=Array.isArray(data.frames)?data.frames:[];newFrame()}
  catch(err){setStatus(err.message,true);newFrame()}
}
(async()=>{try{const session=await api('session');if(session.authenticated)await boot();else loginStatus('')}catch(err){loginStatus(err.message)}})();

window.addEventListener('resize',()=>{if(state.frame)renderStage()});
