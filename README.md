# ARCHI Brief — 백엔드 스타터

건축학도용 일일 브리프 서비스. Supabase(DB+Auth) + Resend(이메일) + Vercel(호스팅+크론) 조합.

## 폴더 구조

```
archi-backend/
├─ public/index.html       # 프론트엔드 (Supabase Auth 연결 완료)
├─ api/
│  ├─ hello.js             # 동작 확인용
│  └─ digest-send.js       # 크론이 호출하는 메일 발송 엔드포인트
├─ lib/
│  ├─ supabase.js          # DB admin 클라이언트
│  ├─ resend.js            # 이메일 발송
│  ├─ crawl.js             # RSS 크롤러
│  └─ digest.js            # 메일 빌더 + 발송 로직
├─ supabase-schema.sql     # DB 테이블 생성 SQL
├─ vercel.json             # 크론 스케줄 (UTC 기준)
├─ package.json
├─ .env.example
└─ .gitignore
```

---

## 0. 사전 준비

이미 설치돼 있어야 함: Node.js LTS, Git, VS Code.
계정 있어야 함: GitHub, Vercel, Supabase, Resend.

---

## 1. 프로젝트 가져가기 (3분)

이 `archi-backend/` 폴더 통째로 컴퓨터의 작업 폴더로 복사.
VS Code에서 그 폴더 열고, VS Code 안의 터미널(Ctrl+\`)에서:

```bash
npm install
```

`node_modules/` 생성됨.

---

## 2. Supabase 세팅 (10분)

1. https://supabase.com/dashboard → **New project** → 프로젝트 이름, DB 비밀번호 정함, 지역 `Northeast Asia (Seoul)` → Create
2. 1~2분 기다림
3. 왼쪽 사이드바 **SQL Editor** → 새 쿼리 → `supabase-schema.sql` 내용 통째로 복붙 → **Run**. "Success" 뜨면 OK.
4. 사이드바 **Authentication → Providers → Email** → **Confirm email** 체크 켜져 있는지 확인 (기본 켜짐). **Save**.
5. 사이드바 **Project Settings → API** → 아래 세 가지 복사해서 메모장에 저장:
   - `Project URL` → `SUPABASE_URL`
   - `anon public` → `SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (절대 외부 노출 금지!)

---

## 3. Resend 세팅 (5분)

1. https://resend.com → 가입 → Dashboard
2. **API Keys** → Create API Key → 권한 `Sending access` → 키 복사 → `RESEND_API_KEY` 메모
3. 처음엔 도메인 없이도 됨. `onboarding@resend.dev` 주소로 **본인 가입 이메일**에만 발송 가능 (Resend 무료 정책).
   → 다른 사람한테도 보내려면: **Domains → Add Domain** → 본인 도메인(또는 무료 도메인) 추가하고 DNS 설정. 검증 끝나면 `lib/resend.js`의 `from` 주소를 `'ARCHI Brief <brief@yourdomain.com>'`로 바꾸기.

---

## 4. 환경변수 입력 (2분)

`.env.example`을 복사해서 `.env.local` 파일 만들고 값 채우기:

```
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOi...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOi...
RESEND_API_KEY=re_...
CRON_SECRET=대충_긴_랜덤_문자열_예를들면_archi_2026_abc_xyz_123
```

`CRON_SECRET`은 본인이 아무 긴 문자열로 정해도 됨 (크론 호출 보안용).

---

## 5. 프론트엔드에 Supabase 키 넣기 (1분)

`public/index.html` 열어서 위쪽에 있는 두 줄 교체:

```js
const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // ← 본인 URL
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // ← 본인 anon key
```

> 주의: `anon key`만 프론트엔드에 둠. `service_role`은 절대 안 됨.

---

## 6. 로컬에서 한 번 돌려보기 (선택, 5분)

```bash
npx vercel login          # 한 번만
npx vercel link           # "Set up and develop" → Y, 새 프로젝트로
npx vercel dev            # http://localhost:3000 에서 서버 가동
```

브라우저에서 `http://localhost:3000` → 회원가입 → 이메일 인증 링크 클릭 → 로그인 → 분야 선택까지 동작하는지 확인.
`http://localhost:3000/api/hello` 들어가면 JSON 응답이 보여야 함.

생략해도 됨. 어차피 7번에서 배포하면 인터넷에서 같은 것 됨.

---

## 7. GitHub에 올리고 Vercel에 배포 (10분)

```bash
git init
git add .
git commit -m "initial"
```

GitHub 가서 **New repository** → 이름 정하고 (예: `archi-brief`) → **Private 권장** → Create.

GitHub이 보여주는 명령어 복붙:

```bash
git remote add origin https://github.com/your-id/archi-brief.git
git branch -M main
git push -u origin main
```

이제 Vercel:
1. https://vercel.com/new → 방금 만든 repo 선택 → Import
2. **Environment Variables** 섹션에서 `.env.local`에 넣은 5개 변수 그대로 추가 (Name + Value)
3. Deploy 클릭
4. 1~2분 뒤 `https://your-project.vercel.app` 주소 받음
5. `https://your-project.vercel.app/api/hello` 들어가서 JSON 보이면 백엔드 OK

---

## 8. Supabase Redirect URL 등록 (2분)

회원가입 이메일 인증 링크가 본인 사이트로 돌아오게 등록:

Supabase Dashboard → **Authentication → URL Configuration**:
- **Site URL**: `https://your-project.vercel.app`
- **Redirect URLs**: `https://your-project.vercel.app/**` 추가

Save.

이제 회원가입 → 이메일에 온 링크 → Vercel 사이트로 돌아와서 자동 로그인까지 됨.

---

## 9. 크론 동작 확인 (5분)

배포된 사이트에 회원가입하고 분야 선택까지 한 다음, 메일이 잘 오는지 **수동 테스트**:

```
https://your-project.vercel.app/api/digest-send?secret=YOUR_CRON_SECRET&slot=evening
```

(URL에 `secret=`은 `.env`에 넣은 `CRON_SECRET` 값 그대로)

JSON으로 `{"ok":true,"slot":"evening","sent":1}` 같이 뜨고, 본인 이메일 받은편지함에 메일 도착하면 **성공**.

자동 크론은 `vercel.json`에 정의돼 있어서 매일 UTC 00:00 (KST 09:00), UTC 09:00 (KST 18:00)에 자동 실행됨.

> ⚠️ Vercel Hobby 플랜은 크론 하루 1회 제한이 풀려있긴 한데, 동시 실행/실행 시간 제한이 있음. 두 개 정도는 무료로 충분.

---

## 10. 크롤링 소스 추가 (지속 작업)

`lib/crawl.js`의 `FEEDS` 배열에 RSS URL 추가하면 됨.

지금은 ArchDaily, Dezeen 두 개만 들어있음. 더 추가하려면:
- 한국 사이트: 대부분 RSS가 없거나 숨김. **네이버 뉴스 RSS** + 검색어 `건축`을 활용하거나, 정부기관(국토부, 서울시) 보도자료 RSS를 활용. 또는 HTML 파싱 (cheerio 추가 필요).
- 해외: 거의 다 RSS 있음. Architectural Record, Building Design+Construction, Architects' Journal 등.

추가 후 `git push`만 하면 Vercel이 자동 재배포.

---

## 자주 막히는 곳

| 증상 | 원인 / 해결 |
|------|-----|
| 회원가입은 되는데 이메일이 안 옴 | Supabase Auth → Email Templates 확인, Spam 폴더 확인 |
| 인증 링크 클릭하면 에러 페이지 | 8단계 Redirect URL 등록 안 됨 |
| `/api/digest-send` 수동 호출이 401 | `?secret=` 값이 `.env`의 `CRON_SECRET`과 다름 |
| 메일은 보내는데 본인 외에 안 옴 | Resend 도메인 검증 안 됨 (3단계 마지막 줄) |
| 분야 저장이 안 됨 | Supabase **RLS 정책**이 켜져 있는지, `supabase-schema.sql` 실행했는지 |
| 크론이 안 돌아감 | Vercel Hobby 플랜 한도, `vercel.json`의 cron schedule, Deployment 환경 변수 확인 |

---

## 다음 단계 (자력으로 가능)

- 프론트엔드 디자인을 `archi-brief.html`(프로토타입)에서 가져와서 `public/index.html`에 적용
- 아카이브 페이지(`digests` 테이블 query)
- "지금 받기" 버튼 → `/api/digest-send?secret=...&slot=now` 호출
- 분야별 자동 분류기 (LLM API 호출로 카테고리 추론)
- 한국어 사이트 HTML 파서 (cheerio + custom selectors)

막히면 에러 메시지 그대로 복붙해서 물어보세요.
