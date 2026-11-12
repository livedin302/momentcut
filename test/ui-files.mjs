import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFile(path.join(root,p),'utf8');
test('촬영 전 설정과 모든 초기화 버튼, 관리자 특별 프레임 UI가 존재',async()=>{
  const html=await read('public/index.html'),js=await read('public/app.js'),admin=await read('public/admin.html');
  for(const id of ['setup','beginCaptureBtn','fullResetCaptureBtn','fullResetEditBtn','fullResetResultBtn','adminFrameOptions'])assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.indexOf('id="setup"')<html.indexOf('id="capture"'));
  assert.match(js,/function fullReset\(\)/);
  assert.match(js,/renderAdminCustomFrame/);
  for(const id of ['frameImage','frameStage','frameTitle','frameSubtitle','saveFrameBtn'])assert.ok(admin.includes(`id="${id}"`),id);
});
