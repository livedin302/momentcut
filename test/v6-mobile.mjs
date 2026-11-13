import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const html=await readFile(new URL('../public/index.html',import.meta.url),'utf8');
const js=await readFile(new URL('../public/app.js',import.meta.url),'utf8');
const css=await readFile(new URL('../public/style.css',import.meta.url),'utf8');
test('전면/후면 카메라 버튼과 촬영 방향 처리',()=>{
  assert.match(html,/id="switchCameraBtn"/);
  assert.match(js,/facingMode:'user'/);
  assert.match(js,/exact:'environment'/);
  assert.match(js,/if\(state\.facingMode==='user'\)\{ctx\.translate/);
  assert.match(css,/\.camera-stage\.rear-camera video\{transform:none\}/);
});
test('모바일 꾸미기 미리보기가 상단에 고정되고 스크롤 중 크기가 제한됨',()=>{
  assert.match(css,/#edit \.preview-panel\{position:sticky;top:66px/);
  assert.match(css,/#edit \.print-stage\{min-height:0;height:clamp\(160px,28dvh,260px\)/);
  assert.match(css,/#edit \.print-stage canvas\{display:block;width:auto;height:auto;max-width:100%;max-height:100%/);
});
test('카카오 인앱 브라우저 저장 제한에 대한 안내 및 대체 저장 화면',()=>{
  for(const id of ['kakaoDownloadNote','openSaveGuideBtn','saveImageDialog','manualSaveImage']) assert.ok(html.includes(`id="${id}"`),id);
  assert.match(js,/function isKakaoBrowser\(\)/);
  assert.match(js,/navigator\.canShare\(\{files:\[file\]\}\)/);
  assert.match(js,/openSaveImageDialog\(\)/);
});
