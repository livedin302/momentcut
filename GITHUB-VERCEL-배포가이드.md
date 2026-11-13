# 모먼트컷 v2: GitHub와 Vercel 배포하는 방법

## 1) ZIP을 압축 해제해 GitHub에 업로드

1. 새 ZIP 압축을 풀고 내부의 파일과 폴더 전체를 준비합니다.
2. GitHub에서 기존 저장소를 열거나 새 저장소 `momentcut`을 만듭니다.
3. 기존 저장소를 사용한다면 **오래된 파일을 새 버전으로 교체**하고, 불필요한 `render.yaml` 및 중첩된 `momentcut/momentcut/` 폴더가 있다면 정리합니다.
4. GitHub `Add file → Upload files`에서 **압축 파일 안의 내용물만** 업로드한 뒤 `Commit changes`를 누릅니다.
5. GitHub 저장소 첫 화면에 `api/`, `public/`, `package.json`, `vercel.json`, `admin-api.mjs`, `frame-store.mjs`가 보여야 합니다.

**주의:** GitHub 웹 업로드 중 폴더가 빠지면 GitHub Desktop으로 압축 해제한 프로젝트 폴더 전체를 추가해 주세요.

## 2) Vercel 프로젝트 연결

1. https://vercel.com/new 에서 GitHub 저장소를 선택합니다.
2. 만약 `Multiple applications detected` 메시지가 보이면 **정확한 루트 디렉터리**를 선택하고 `Import single project`로 진행합니다. 오래된 중첩 폴더가 문제라면 GitHub에서 정리 후 다시 가져옵니다.
3. 프로젝트 설정: `Framework Preset: Other`, `Root Directory: ./`, `Build Command: 빈칸`, `Output Directory: public`.
4. 배포 버튼을 누릅니다.

## 3) Vercel 관리자 보안 설정

Vercel 프로젝트 → `Settings → Environment Variables`에서 아래 키 2개를 추가합니다.

- `ADMIN_PASSWORD` : 본인이 정한 강력한 관리자 비밀번호
- `ADMIN_SESSION_SECRET` : 긴 임의의 비밀 문자열 (터미널에서 `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"` 실행)

**비밀 값은 GitHub나 다른 사람에게 공유하지 마세요.** 환경 변수 추가 뒤 Vercel `Deployments → Redeploy`를 실행해야 새 값이 적용됩니다.

## 4) 프레임 저장소 만들기

Vercel 프로젝트의 `Storage → Create Database → Blob`을 선택하고 **Private**로 저장소를 생성한 뒤 프로젝트에 연결합니다. `BLOB_READ_WRITE_TOKEN`이 설정되었는지 확인하고 **재배포**합니다.

프레임 관리와 사진 공유는 Blob이 필요하고, 일반 촬영/PNG 저장은 없어도 됩니다.

## 5) 사용 주소

- `https://본인의-배포주소.vercel.app/` : 일반 촬영 사이트
- `https://본인의-배포주소.vercel.app/admin.html` : 관리자 사이트
- `https://본인의-배포주소.vercel.app/api/health` : 정상일 때 `{ "ok": true, "service": "momentcut", "mode": "vercel" }`

### 사용 순서

관리자가 `/admin.html`에서 로그인 → **새 프레임** → 이미지 선택 → 미리보기에서 각 사진 영역 이동/크기 조절 → 문구·색상·글자 위치 수정 → `프레임 저장 · 사이트에 공개`.

일반 사용자는 홈 → **촬영 설정** → 촬영 → 꾸미기 → `관리자 특별 프레임` 선택 → 완성/저장.

## 6) 흔한 문제

| 증상 | 확인 내용 |
| --- | --- |
| 404 NOT_FOUND | GitHub 최상단에 `public/`, `api/`, `vercel.json`이 있는지 확인. Root Directory `./` |
| 관리자 화면 503 | `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` 추가/재배포 |
| 로그인 실패 | 환경 변수 값과 입력 비밀번호가 정확히 일치하는지 확인 |
| 프레임 저장 503 | Vercel **Private Blob** 연결, `BLOB_READ_WRITE_TOKEN`, 재배포 확인 |
| 프레임 수정이 바로 안 보임 | Vercel Blob 캐시 때문에 최대 약 1분 후 새로고침 |
| 카메라가 안 열림 | HTTPS, 브라우저 카메라 권한 확인 |
| QR 공유 503 | Private Blob 연결 및 토큰 확인 |
