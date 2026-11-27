# CLAUDE.md

## 0\. 버전 확인 (작업 시작 전 필수)

- **기준 버전:** Next.js 16.x / Prisma 7.x / `@supabase/ssr` 최신  
- 작업 전 `package.json`에서 실제 설치 버전을 확인하고, **그 버전의 공식 문서 기준**으로 코드를 작성합니다. 예전 버전의 예제나 방식을 섞지 않습니다.  
- 버전에 따라 방식이 다른 규칙은 `[Next 16+]`, `[Prisma 7+]`처럼 표시했습니다. 실제 버전이 다르면 그 버전에 맞는 방식으로 진행하고, 사용자에게 한 줄로 알립니다.

## 1\. 협업 원칙 (비개발자 맞춤)

- **사용자 배경:** 사용자는 개발 지식이 없는 기획자/오너입니다. 모든 소통은 한국어로 하며, 전문 용어가 필요할 때는 일상적인 비유를 덧붙여 쉽게 설명합니다.  
- **계획 우선 (Plan First):**  
  - **먼저 계획 보고 후 동의받기:** 새 기능, DB 스키마 변경, 패키지 추가·삭제, 여러 파일에 걸친 수정, 인증·결제 관련 수정  
  - **바로 진행 후 한 줄 보고:** 오타, 문구, 색상·여백 등 스타일 수정, 한 파일 안의 명백한 버그 수정  
  - 계획은 파일명·코드 용어가 아니라 아래 4가지로 보고합니다.  
    1. 화면에서 무엇이 달라지는지  
    2. 기존 데이터가 지워지거나 바뀔 위험이 있는지  
    3. 문제가 생기면 되돌릴 수 있는지  
    4. 사용자가 직접 해야 할 일 (대시보드 설정 등)  
- **질문은 꼭 필요할 때만:** 사용자 경험·비용·일정에 영향을 주는 결정만 묻습니다. 그 외의 순수 기술적 결정은 추천안대로 진행하고 무엇을 골랐는지 한 줄로 알립니다.  
- **선택지 제시:** 물어야 할 때는 2가지 이하의 선택지와 추천안을 함께 제시합니다. 장단점은 기획자 관점(사용자 경험, 비용, 나중에 바꾸기 쉬운지)으로 설명합니다.  
- **에러 보고 방식:** 에러 로그 원문만 던지지 말고 (1) 무슨 문제인지, (2) 왜 생겼는지, (3) 어떻게 고칠지, (4) 사용자가 해야 할 일이 있는지 요약합니다. 추가 로그가 필요하면 어디서 어떻게 복사해 오는지(브라우저 개발자 도구의 Console 탭, Vercel 대시보드의 Logs 등) 단계별로 안내합니다.

## 2\. 기술 스택

- **Framework:** Next.js 16 (App Router) \+ TypeScript  
- **Styling:** Tailwind CSS  
- **Database / ORM:** PostgreSQL (Supabase 호스팅) \+ Prisma 7 (`@prisma/adapter-pg`)  
- **Auth:** Supabase Auth (`@supabase/ssr`) — **인증 전용**  
- **Lint:** ESLint (`npm run lint`)  
- **Deployment:** Vercel

## 3\. 폴더 구조

- `app/` — 페이지, 레이아웃. Server Actions는 해당 페이지 폴더의 `actions.ts`에 둡니다.  
- `app/api/` — Route Handlers  
- `components/` — 재사용 UI 컴포넌트  
- `lib/supabase/client.ts`, `lib/supabase/server.ts` — Supabase 클라이언트 (브라우저용 / 서버용)  
- `lib/prisma.ts` — PrismaClient 단일 인스턴스  
- `prisma/` — `schema.prisma`, `migrations/`  
- 새 파일은 이 구조를 따르고, 새 최상위 폴더가 필요하면 먼저 알립니다.

## 4\. Next.js 서버·클라이언트 경계 규칙

- **서버 우선 원칙:** 모든 컴포넌트는 기본적으로 Server Component로 작성합니다. 클릭, 입력 폼, 상태 변화 등 브라우저 상호작용이 꼭 필요한 최소 단위의 컴포넌트에만 `'use client'`를 선언합니다.  
- **비밀키 격리:** API 키, DB 접속 정보, 결제·인증 로직은 반드시 서버 영역(Server Actions, Route Handlers, `server-only` 모듈)에서만 처리합니다. `NEXT_PUBLIC_` 접두사는 브라우저에 공개되어도 안전한 값에만 사용합니다. Supabase의 secret 키(service\_role 키)에는 절대 `NEXT_PUBLIC_`을 붙이지 않습니다.  
- **데이터 흐름 단순화:** 페이지 초기 데이터 로딩은 서버 컴포넌트에서 처리하고, 생성·수정·삭제는 Server Actions 또는 `/api` Route Handlers로 일관되게 처리합니다.  
- **서버 → 클라이언트 데이터 전달:** Prisma 조회 결과를 Client Component에 통째로 넘기지 않고, 필요한 필드만 골라 일반 객체로 넘깁니다. `Decimal` 타입은 숫자나 문자열로 변환해서 넘깁니다.  
- **변경 후 화면 갱신:** 생성·수정·삭제 후에는 `revalidatePath()` 또는 `redirect()`로 화면이 최신 데이터를 보여주게 합니다. ("저장했는데 화면이 그대로예요" 방지)

## 5\. Supabase 탈의존 및 Prisma · Vercel 규칙

- **Supabase는 인증 전용 (최소 의존성):**  
  - Supabase SDK(`@supabase/ssr`)는 오직 회원가입, 로그인, 로그아웃, 세션 확인 등 **인증(Auth) 기능에만** 사용합니다.  
  - `supabase.from()` 데이터 조회, Supabase RPC, Edge Functions, DB 트리거 등 Supabase 종속 기능은 사용하지 않습니다.  
- **비즈니스 로직은 Prisma \+ TypeScript로 일원화:**  
  - 모든 데이터 조회·생성·수정·삭제 및 비즈니스 로직은 Next.js 서버 코드와 Prisma로 구현합니다.  
  - Supabase 인증 유저와 앱 내부의 `User` 테이블 동기화 역시 DB 트리거 대신 Next.js 서버 로직(로그인/회원가입 콜백에서 Prisma `upsert` 등)으로 처리해 코드만 보고도 전체 흐름을 파악할 수 있게 합니다.  
- **서버 권한 검증 필수:**  
  - Prisma는 Supabase RLS를 거치지 않고 DB에 직접 접근합니다. 따라서 모든 비공개 데이터 조회·수정·삭제 전에 서버에서 로그인 여부를 확인하고, Prisma 로직에서 데이터 소유권과 권한을 직접 검증합니다.  
  - 로그인 확인은 `supabase.auth.getClaims()`를 기본으로 사용하고, 비밀번호 변경·결제·회원 탈퇴처럼 중요한 작업에는 `supabase.auth.getUser()`를 사용합니다.  
  - 클라이언트가 보낸 `userId`나 서버 측 `getSession()`만 단독으로 신뢰하지 않습니다.  
- **요청 가로채기 파일 (세션 갱신용):**  
  - `[Next 16+]` 프로젝트 루트(또는 `src/`)의 `proxy.ts`에 `export function proxy()`로 작성합니다. Next 15 이하라면 `middleware.ts`를 사용합니다. 두 파일을 동시에 두지 않습니다.  
  - 이 파일은 모든 요청마다 실행되므로 Supabase 인증 세션 갱신만 처리하고, Prisma 호출이나 무거운 로직은 넣지 않습니다.  
- **DB 연결:**  
  - `DATABASE_URL` \= Supabase Transaction Pooler 주소 (앱 실행용)  
  - `DIRECT_URL` \= Supabase Direct Connection 주소 (마이그레이션 등 Prisma CLI용)  
  - `[Prisma 7+]` `schema.prisma`의 datasource에는 `url`/`directUrl`을 쓰지 않습니다. `prisma.config.ts`의 `datasource.url`에 `DIRECT_URL`을 넣고, 앱의 PrismaClient는 `@prisma/adapter-pg`에 `DATABASE_URL`을 넘겨 생성합니다.  
  - `[Prisma 6 이하]` `schema.prisma`의 datasource에 `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")`을 씁니다.  
  - `schema.prisma` 수정 후에는 `npx prisma generate`가 정상 반영되는지 확인합니다.  
- **Vercel 배포 호환성:**  
  - `package.json`의 build 스크립트에 Prisma 클라이언트 생성을 포함합니다. 예: `"build": "prisma generate && next build"`  
  - 새 환경변수가 필요하면 `.env.example`에 키 이름만 추가하고, 사용자에게 **로컬 `.env`와 Vercel 대시보드(Environment Variables) 양쪽에 모두 등록해야 함**을 안내합니다.

## 6\. DB 안전 규칙

- **개발 DB와 운영 DB 분리:** 개발용과 운영용 Supabase 프로젝트를 따로 둡니다. 로컬 `.env`에는 개발용 주소를, Vercel의 Production 환경변수에는 운영용 주소를 넣습니다. 분리되어 있지 않다면 DB 작업 전에 사용자에게 알리고 분리를 권합니다.  
- **마이그레이션:** 로컬 개발 DB에는 `npx prisma migrate dev`, 운영 DB에는 `npx prisma migrate deploy`만 사용합니다.  
- **사용자 승인 없이 절대 실행하지 않는 것:**  
  - `prisma migrate reset`, `--force-reset`  
  - `prisma db push` (특히 `--accept-data-loss`)  
  - 운영 DB 주소로 `prisma migrate dev` 실행  
  - 이미 적용된 `prisma/migrations/` 안의 파일 수정·삭제  
  - `DROP`, `TRUNCATE`, 조건 없는 `DELETE`/`UPDATE` (`prisma db execute`나 SQL 직접 실행 포함)  
- `migrate dev`가 DB 초기화(reset)를 요구하거나 스키마 불일치(drift)를 감지하면, 그 자리에서 멈추고 사용자에게 상황과 선택지를 보고합니다.

## 7\. Git · 되돌리기

- 작업 시작 전 `git status`로 저장(커밋)되지 않은 변경이 있는지 확인하고, 있으면 먼저 커밋할지 사용자에게 묻습니다.  
- 기능 단위로 커밋하고, 커밋 메시지는 한국어로 "무엇이 바뀌었는지" 적습니다.  
- `main` 브랜치에는 사용자 승인 없이 push하지 않습니다. 작업은 별도 브랜치에서 하고, push 후 생성되는 Vercel Preview 주소에서 먼저 확인한 뒤 `main`에 합칩니다.  
- 사용자가 "되돌려줘"라고 하면 어느 시점(커밋)으로 돌아가는지 쉽게 설명합니다. 저장 안 된 작업이나 기록이 사라질 수 있는 명령(`git reset --hard`, `git push --force` 등)은 승인 후에만 실행합니다.

## 8\. 안전장치 및 금지 사항

- **환경변수 보호:**  
  - `.env` 파일의 실제 키 값을 코드에 하드코딩하거나 채팅·로그·Git에 노출하지 않습니다.  
  - `.env`, `.env.local` 등 실제 값이 든 파일은 열어보지 않습니다. 환경변수 문제를 진단할 때는 사용자에게 `grep -o '^[A-Z_]*=' .env` 실행 결과(키 이름만 나옴)를 요청해 `.env.example`과 비교합니다.  
  - `.env.example`은 자유롭게 읽고 수정합니다.  
  - `.gitignore`에 `.env*`가 포함되어 있고 `!.env.example`로 예시 파일만 예외 처리되어 있는지 확인합니다.  
- **최소 변경 원칙:** 요청받은 기능과 무관한 기존 코드를 임의로 리팩토링하거나 삭제하지 않습니다.  
- **패키지 절제:** Next.js나 기본 기능으로 해결 가능한 일에 불필요한 외부 라이브러리를 추가하지 않습니다. 단, 버전상 필수인 패키지(`@prisma/adapter-pg` 등)는 예외이며, 추가할 때 이유를 한 줄로 알립니다.

## 9\. 자체 검증 및 완료 기준

"완료했습니다"라고 보고하기 전에 아래를 스스로 확인합니다.

1. `npm run lint` — ESLint 오류 확인. (Next 16부터는 `next build`가 린트를 검사하지 않으므로 따로 실행합니다. `lint` 스크립트가 없으면 `"lint": "eslint ."`를 추가합니다.)  
2. `npm run build` — TypeScript 타입 오류와 빌드 오류 확인.  
3. `npm run dev`로 개발 서버를 띄우고 바뀐 페이지에 실제로 접속해, 서버 터미널에 에러가 없는지 확인합니다.  
4. 서버 → 클라이언트로 넘기는 데이터가 필요한 필드만 담은 일반 객체인지, 데이터 변경 후 화면 갱신(`revalidatePath`/`redirect`)이 들어갔는지 점검합니다.  
5. 완료 보고에는 아래를 함께 안내합니다.  
   - **변경 내용 요약** (화면 기준으로)  
   - **사용자가 화면에서 직접 눌러볼 테스트 순서**, 그리고 로그인이 필요한 기능이면 아래 권한 테스트도 포함합니다.  
     - 로그아웃 상태에서 보호된 페이지 주소를 주소창에 직접 입력했을 때 막히는지  
     - 두 번째 계정으로 로그인해 첫 번째 계정의 데이터 주소를 열었을 때 막히는지  
   - **사용자가 대시보드에서 직접 해야 할 설정** (있을 경우)  
     - Vercel: Environment Variables 등록 (Production / Preview 각각)  
     - Supabase: Authentication → URL Configuration의 Site URL과 Redirect URLs에 로컬 주소, Vercel 운영 도메인, Preview 도메인 등록  
   - **Git 상태:** 어느 브랜치에 커밋했는지, push 여부