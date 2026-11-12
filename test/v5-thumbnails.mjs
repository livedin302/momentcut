import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');

test('selected layout uses the same photo aspect ratio for camera and retake thumbnails',async()=>{
  const js=await read('public/app.js');
  const fragment=js.split('const LAYOUT_PRESETS = ')[1]?.split('\nconst FRAME_STYLES = ')[0];
  assert.ok(fragment);
  const layouts=vm.runInNewContext('('+fragment.replace(/;\s*$/,'')+')');
  for(const layout of layouts){
    const s=layout.slots[0];
    const ratio=s.w*layout.w/(s.h*layout.h);
    assert.ok(Number.isFinite(ratio)&&ratio>0,layout.id);
    assert.ok(Math.abs((s.w*layout.w)/(s.h*layout.h)-ratio)<1e-8);
  }
  assert.match(js,/function currentPhotoRatio\(\)/);
  assert.match(js,/ui\.shotGrid\.style\.setProperty\('--shot-ratio', String\(shotRatio\)\)/);
  assert.match(js,/ui\.shotGrid\.classList\.toggle\('shots-landscape', shotRatio>=1\)/);
  assert.match(js,/ui\.shotGrid\.classList\.toggle\('shots-portrait', shotRatio<1\)/);
  assert.match(js,/data-retake="\$\{i\}"/);
  const css=await read('public/style.css');
  assert.match(css,/aspect-ratio:var\(--shot-ratio,3\/4\)/);
  assert.match(css,/\.shot-grid\.shots-landscape\{grid-template-columns:repeat\(2/);
  assert.match(css,/\.shot-grid \.shot-cell img\{\s*position:absolute;/);
});

test('export renderer no longer paints thin white borders around photo slots',async()=>{
  const js=await read('public/app.js');
  const code=js.split('function drawPhotoSlot(')[1]?.split('\nasync function renderPreview()')[0];
  assert.ok(code,'photo slot renderer');
  assert.match(code,/ctx\.clip\(\)/);
  assert.doesNotMatch(code,/ctx\.stroke\(\)/);
  assert.doesNotMatch(code,/rgba\(255,255,255/);
});
