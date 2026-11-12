import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';

const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(dir,p),'utf8');

test('basic 4-cut: 4x6 sheet has two matching 2x6 strips and landscape photographs',async()=>{
  const js=await read('public/app.js');
  const fragment=js.split('const LAYOUT_PRESETS = ')[1]?.split('\nconst FRAME_STYLES = ')[0];
  assert.ok(fragment,'layout presets source is present');
  const presets=vm.runInNewContext('('+fragment.replace(/;\s*$/,'')+')');
  const basic=presets.find(p=>p.id==='basic4-double');
  assert.ok(basic,'basic4-double layout should exist');
  assert.equal(basic.w,1200);
  assert.equal(basic.h,1800);
  assert.equal(basic.slots.length,8);
  assert.deepEqual(Array.from(basic.slots.slice(0,4),s=>s.photo),[0,1,2,3]);
  assert.deepEqual(Array.from(basic.slots.slice(4),s=>s.photo),[0,1,2,3]);
  for(let i=0;i<4;i++){
    const left=basic.slots[i],right=basic.slots[i+4];
    assert.equal(right.x-left.x,.5);
    assert.equal(left.y,right.y);
    assert.equal(left.w,right.w);
    assert.equal(left.h,right.h);
    assert.ok(left.w*basic.w > left.h*basic.h,'each photo should be landscape');
  }
  assert.ok(basic.slots[3].y+basic.slots[3].h >= .84,'photos should fill most of the strip height');
  assert.match(js,/for\(const centerX of \[preset\.w\*\.25,preset\.w\*\.75\]\)/,'title repeated on both 2x6 strips');
  assert.doesNotMatch(js,/fillText\(getCurrentPreset\(\)\.name/,'layout name must not print on photo');
  assert.doesNotMatch(js,/fillText\(preset\.badge/,'layout badge must not print on photo');
});

test('frame styles: collapsible category menu and 10-second timer remain available',async()=>{
  const js=await read('public/app.js'),html=await read('public/index.html'),css=await read('public/style.css');
  assert.match(js,/<details class="frame-category"/);
  assert.match(js,/data-frame-category/);
  assert.match(js,/details\.isConnected/);
  assert.match(css,/\.frame-category\[open\]/);
  assert.match(html,/data-timer="10"/);
});
