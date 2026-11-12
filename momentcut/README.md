# 📸 모먼트컷 — GitHub + Vercel 배포용

인생네컷 스타일 사진 촬영 웹사이트. 카메라 촬영(수동·3초·5초), 4컷·6컷, 재촬영, 프레임/필터/스티커/문구/로고 편집, PNG 다운로드, 사진 공유 링크와 QR코드를 지원합니다.

## 바로 배포하기

**[GITHUB-VERCEL-배포가이드.md](./GITHUB-VERCEL-배포가이드.md)**를 열어 차례대로 진행하세요.

핵심 설정:

| 항목 | 값 |
|---|---|
| GitHub 저장소 최상위 | `package.json`, `vercel.json`, `public/`, `api/` |
| Vercel Framework Preset | **Other** |
| Root Directory | **`./` (기본값)** |
| Build Command | **비움** (별도의 프런트엔드 빌드 불필요) |
| Output Directory | **`public`** (`vercel.json`에 지정됨) |
| Install Command | **기본값** (`npm install`) |

사이트 배포 자체에는 Blob 스토리지가 필요하지 않습니다. 다만 **QR 공유 링크 생성**까지 사용하려면 Vercel 프로젝트에 **Private Vercel Blob** 스토리지를 연결해야 합니다. 연결하면 `BLOB_READ_WRITE_TOKEN`이 프로젝트에 설정됩니다. 연결 후 재배포하세요.

확인 주소:

- `/` — 홈페이지
- `/api/health` — `{"ok":true,"service":"momentcut","mode":"vercel"}`
- `/api/qr?text=hello` — QR SVG 이미지

## 배포 시 수정한 점

- 정적 웹 페이지를 `public/`에 모으고 `vercel.json`에서 배포 출력 위치를 명시했습니다.
- 복잡한 `rewrites` 대신 `/api/*.mjs` Vercel Functions를 직접 사용합니다.
- 사진 공유 주소를 `/api/view?id=...`와 `/api/image?id=...`로 통일했습니다.
- Vercel Functions는 최신 **Web `Request`/`Response` 방식**으로 구현했습니다.
- Private Vercel Blob API를 사용하기 위해 `@vercel/blob` 버전을 `^2.3.0` 이상으로 지정했습니다.
- Blob 저장소가 없어도 **사진 촬영/꾸미기/PNG 저장**이 동작하며, 링크 공유 시 연결 안내를 표시합니다.
- Vercel Functions 본문 크기 제한을 고려해 **3MB 이하 PNG만 링크로 공유**합니다. PNG 파일 다운로드는 이 제한과 무관합니다.

## 로컬 테스트

Node.js 20 이상 필요:

```bash
npm install
npm run check
npm start
```

브라우저에서 `http://localhost:3000`에 접속하세요. 로컬에서는 링크 공유 사진이 `shared/` 폴더에 저장됩니다. 이 폴더와 `.env` 파일은 `.gitignore`에 의해 GitHub 업로드에서 제외됩니다.

## 개인정보 및 보관 정책 안내

- 일반 촬영·꾸미기·PNG 저장은 사용자의 브라우저에서 처리됩니다.
- **공유 링크 생성**을 누르면 사진이 Vercel Blob 저장소에 업로드됩니다. 링크가 알려지면 누구나 해당 사진을 열 수 있습니다.
- **공유 링크는 7일 후 만료**됩니다. 만료 후 누군가 열어보면 관련 Blob을 삭제하도록 설계되어 있습니다. **아무도 만료된 링크에 접속하지 않는다면 Blob 파일이 자동으로 물리 삭제되지는 않습니다.** 운영자는 Vercel Storage에서 오래된 Blob을 별도로 정리해야 합니다.
- Vercel Blob은 사용량에 따른 한도 및 비용이 발생할 수 있습니다. 공개 서비스 운영 시 요금과 사용량을 주기적으로 확인하세요.
- 카메라는 **HTTPS** 또는 **localhost**에서만 접근할 수 있으며, 사용자에게 권한 허용을 받아야 합니다.

## 포함 파일

```text
public/
  index.html       정적 홈페이지·4개 화면
  style.css        디자인
  app.js           카메라 촬영·편집·다운로드·공유 UI
api/
  health.mjs       상태 확인
  qr.mjs           QR 코드 생성
  share.mjs        사진 업로드
  view.mjs         공유 페이지
  image.mjs        공유 이미지
vercel-api.mjs      Vercel 서버리스 구현
server.js           로컬 Node 서버
vercel.json         Vercel 배포 설정
package.json        런타임·의존성
```
