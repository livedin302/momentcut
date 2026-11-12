# 모먼트컷 — 배포 오류 수정판 📸

이 패키지는 **기존 ZIP 내부에 `momentcut/` 폴더가 한 번 더 들어 있고, HTML 파일이 `/public/index.html`에 있어 정적 호스팅 서비스에서 404가 날 수 있던 문제**를 해결하기 위한 배포 설정이 포함되어 있습니다.

압축을 풀면 `package.json`, `server.js`, `vercel.json`, `render.yaml`, `netlify.toml`, `api/`, `public/`이 **프로젝트 최상위**에 바로 있어야 합니다. GitHub 저장소에 업로드할 때 `momentcut/` 같은 중간 폴더를 추가하지 마세요.

## 가장 추천: Render (Node.js Web Service)

사진 찍기, 꾸미기, PNG 다운로드, QR 링크 공유를 처음부터 한 서버에서 실행할 수 있습니다.

1. 압축을 푼 **프로젝트 내용물**을 GitHub 저장소 최상위에 업로드합니다.
2. Render → **New** → **Web Service** → GitHub 저장소를 연결합니다. `Static Site`가 아닙니다.
3. 아래 설정을 사용합니다.
   - Language / Runtime: **Node**
   - Root Directory: **빈칸** (`server.js`가 하위 폴더에 있다면 그 폴더명)
   - Build Command: `npm install`
   - Start Command: `npm start`
4. 배포 완료 후 `https://<사이트명>.onrender.com/` 에 접속합니다.
5. `https://<사이트명>.onrender.com/health` 에서 `{"ok":true,...}` 가 나오면 서버가 정상 실행 중입니다.

주의: Render의 **영구 디스크 없는 서비스**는 재시작·재배포 시 공유 이미지가 사라질 수 있습니다. 링크가 7일간 반드시 유지되어야 한다면 영구 스토리지 디스크를 연결하고 환경변수 `SHARED_DIR`을 그 디스크 경로로 지정하거나 별도 오브젝트 스토리지를 연결하세요. 이 샘플은 로컬 폴더에 저장하며 7일이 지난 사진은 서버의 정리 작업에서 삭제합니다.

## Vercel 배포

1. 프로젝트 내용물을 GitHub 저장소 최상위에 업로드합니다.
2. Vercel → Add New → Project → 저장소 연결.
3. **Root Directory**: `package.json`이 있는 위치(일반적으로 `./`). **Framework Preset**: `Other`. **Build Command**: 비워 두거나 기본값. **Output Directory**: 비워 둡니다(수동으로 `dist` 등을 입력하지 마세요).
4. `vercel.json`이 정적 페이지 외에 QR/API 요청을 Vercel Function으로 연결합니다. HTTPS 제공.
5. **사진 촬영·꾸미기·PNG 다운로드**는 추가 스토리지 없이 작동합니다.
6. **서버에 사진을 저장하는 QR 공유**까지 사용하려면 Vercel 프로젝트의 **Storage → Blob**에서 **Private** Blob store를 생성하고 프로젝트에 연결하세요. `BLOB_READ_WRITE_TOKEN` 환경변수가 자동 설정되는지 확인하고 다시 배포하세요. Vercel 서버리스 환경은 로컬 파일에 공유 사진을 계속 보관할 수 없습니다. 서버 업로드 제한상 Vercel에서 공유용 PNG는 약 3MB 이하여야 합니다.

**Vercel 주의:** 공유 링크는 생성 시점부터 **7일 동안만 열리도록** 처리되어 있습니다. Blob 파일은 만료된 링크를 누르면 삭제하지만, 링크를 재방문하지 않으면 스토리지에서 자동 물리 삭제되는 것은 아닙니다. 운영 서비스에는 주기적 정리 작업을 추가해야 합니다.

## Netlify/Cloudflare Pages/GitHub Pages (정적 호스팅)

정적 호스팅은 **사진 촬영·꾸미기·PNG 다운로드**는 지원하지만 Node 서버가 필요한 **QR 공유 링크 저장은 그대로 사용할 수 없습니다**.

- **Netlify:** 포함된 `netlify.toml` 덕분에 Publish Directory가 `public`으로 설정됩니다. 수동 설정 시에도 `public`을 지정하세요.
- **Cloudflare Pages:** Framework `None`; Build command 비움; Build output directory `public`.
- **GitHub Pages:** `public` 폴더의 파일을 Pages 서비스 루트에 올리는 별도 과정이 필요합니다. 그리고 사이트가 하위 경로에 있으면 CSS/JS 경로(`/style.css`)도 수정해야 합니다.
- **전체 기능**이 필요하면 **Render Web Service** 또는 **Vercel + Blob**을 사용하세요.

## 로컬 실행

Node.js 20 이상 사용:

```bash
npm install
npm start
```

브라우저에서 http://localhost:3000 열기. `npm run check`로 코드 구문 검사.

## 배포 후 문제 해결

- **404 NOT_FOUND**: ZIP 폴더 구조, Vercel Root Directory/Output Directory, 또는 Render에서 **Static Site**를 선택했는지 확인.
- **사이트는 보이지만 카메라가 작동하지 않음**: HTTPS 사용 및 브라우저 카메라 접근 허용.
- **QR 공유가 안 됨**: Render에서는 서버 로그 확인. Vercel에서는 Blob store 연결 여부 확인. Netlify 등 정적 호스팅은 QR 공유 서버가 없음.
- **링크가 바로 404**: 실서비스 URL 전체를 확인하고 `/health`(Render) 또는 `/`(Vercel) 접속 결과를 확인.

## 개인정보/공유 안내

편집 중 사진은 브라우저에서 처리되며 PNG 다운로드는 서버 저장을 요구하지 않습니다. `공유 링크 · QR 만들기`를 누르면 사진이 서버/스토리지에 저장되고, **링크를 아는 사람은 사진을 볼 수 있습니다**. 따라서 개인 정보가 담긴 사진을 공유할 때는 주의하세요.
