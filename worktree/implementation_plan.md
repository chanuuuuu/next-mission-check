# 셀프 체크인 시스템 통합 구현 플랜

## 🎯 AI 에이전트(Claude Code / Cursor) 작업 지침

- **기술 스택:** Next.js 16 (App Router), Neon DB (Serverless Postgres), TanStack Query v5, Tailwind CSS v4, SSE (Vercel Edge Runtime), Discord Webhook.
- **중요 — Next.js 16 Breaking Changes:**
  - `middleware.ts` → `proxy.ts`로 이름 변경됨. `export const runtime = 'edge'`는 Proxy 파일에서 사용 불가 (에러 발생). Route Handler(`route.ts`)에서는 여전히 사용 가능.
  - Route Handler의 `params`는 Promise로 래핑됨: `const { churchId } = await params`.
  - 코드 작성 전 반드시 `node_modules/next/dist/docs/` 가이드를 참조할 것.
- **중요 — Tailwind CSS v4:** `tailwind.config.js` 없음. `@import "tailwindcss"` 및 `@theme` CSS 디렉티브 방식으로 설정. 외부에서 가져온 v3 기반 컴포넌트 스타일은 v4 문법으로 변환 필요.
- **중요 — `lib/db.ts` 런타임 분기:** Edge Runtime에서는 `neon()` HTTP 드라이버, Node.js 환경에서는 `Pool` 사용. `import { neon } from '@neondatabase/serverless'`가 Edge SSE 핸들러의 기본.
- **QR 설계 원칙:** QR 코드는 `churchId`만 포함하는 결정적(Deterministic) 방식. sessionId는 QR에 포함하지 않음. 모바일-스캐너 연동은 `churchId` 기반 SSE 채널로 처리.
- **SSE 설계 원칙:** 최대 동시 접속 10명 기준. Edge Runtime에서 `setInterval` 폴링(1~2초 간격)으로 DB 상태 변화를 감지. 체크인 제출 완료 또는 연결 종료 시 스트림 즉시 닫음.
- **개발 환경 하네스 원칙:** 실제 카메라 기기나 외부 QR 코드 없이도 로컬에서 100% E2E 테스트가 가능하도록, Phase 0에서 정의한 수동 데이터 모킹 패널(JSON 복사-붙여넣기 방식)을 최우선으로 구축한 뒤 도메인 개발을 진행할 것.
- **실행 및 체크:** 각 단계를 순차적으로 진행하며, 완수할 때마다 `[ ]`를 `[x]`로 업데이트할 것. 마일스톤(Phase)이 종료될 때마다 사용자에게 작업 결과를 보고하고 승인을 받을 것.

---

## Phase 0: 하네스(Harness) 및 테스트 환경 구축 (직렬 실행)

_목표: 카메라 하드웨어 없이도 전체 스캔-화면전환 흐름을 완벽히 시뮬레이션할 수 있는 테스트 환경 세팅_

- [ ] 0.1. **공통 타입 명세 작성:** `src/types/index.ts` 파일을 생성하고 아래 인터페이스를 선언합니다.
  ```ts
  interface Church { id: number; name: string; created_at: string }
  interface Checkin { id: number; church_id: number; phase_code: string; is_all_arrived: boolean; total_count: number; report_notes: string | null; dynamic_questions: Record<string, unknown> | null; checked_in_at: string }
  interface ScannerSession { church_id: number; status: 'PENDING' | 'SCANNED' | 'COMPLETED'; scanned_at: string | null; updated_at: string }
  interface QRDataPayload { churchId: number } // sessionId 없음 — 결정적 QR 설계
  interface AppSettings { active_phase: string } // 현재 활성 Phase
  ```
- [ ] 0.2. **더미 데이터 시드(Seed) 스크립트 작성:** `src/lib/seed.ts`를 생성하여 초기 테스트용 교회 마스터 데이터 10개와, 1일차 아침(`1A`)의 샘플 체크인 내역 3건을 Neon DB에 주입할 수 있도록 합니다. `active_phase`를 `1A`로 초기화하는 쿼리도 포함합니다.
- [ ] 0.3. **[핵심] 수동 강제 스캔 디버그 패널 구현 (개발 모드 전용):**
  - **모바일 QR 생성 페이지:** `process.env.NODE_ENV === 'development'`일 때, 화면에 표시되는 QR 코드 하단에 스캔용 데이터 페이로드(`{"churchId": 1}`)를 텍스트로 노출하고 코드를 쉽게 복사할 수 있는 버튼을 배치합니다.
  - **PC 스캐너 페이지:** 개발 모드일 때 웹캠 뷰 옆에 `MockScannerPanel`을 노출합니다. 이 패널은 JSON 텍스트 입력창(`{"churchId": 1}` 형태)과 [강제 스캔 트리거] 버튼으로 구성되며, 버튼을 누르면 실제 `html5-qrcode`가 QR 코드를 인식했을 때와 동일하게 내부 `onScanSuccess(decodedData)` 콜백 함수를 강제로 호출시킵니다.

---

## Phase 1: 인프라 구성 (직렬 실행)

_목표: 서버리스 데이터베이스 뼈대 및 공통 유틸리티 구성_

> **주의:** Phase 1.1(Next.js 프로젝트 초기화)은 이미 완료 상태입니다. 건너뜁니다.

- [x] 1.1. ~~Tailwind CSS 및 TypeScript가 내장된 Next.js 프로젝트를 초기화합니다.~~ _(완료 — Next.js 16.2.6, React 19, Tailwind CSS v4로 이미 초기화됨)_
- [ ] 1.2. 누락된 외부 의존성 패키지를 추가 설치합니다:
  - `react-qr-code` (QR 코드 화면 생성용 — **기존 목록에 없던 누락 패키지**)
  - _(이미 설치됨: `@neondatabase/serverless`, `@tanstack/react-query`, `@tanstack/react-query-devtools`, `html5-qrcode`, `lucide-react`, `clsx`, `tailwind-merge`)_
- [ ] 1.3. `.env.local` 파일에 `DATABASE_URL` 및 `DISCORD_WEBHOOK_URL` 환경 변수를 세팅합니다.
- [ ] 1.4. `src/lib/db.ts` 연결 유틸리티를 아래 원칙에 따라 작성합니다:
  - **Edge Runtime(SSE Route Handler)용:** `neon()` HTTP 드라이버 사용 (`import { neon } from '@neondatabase/serverless'`)
  - **Node.js Runtime(일반 Route Handler)용:** `Pool` 또는 `neon()` 동일하게 사용 가능
  - Edge에서는 `Pool`(WebSocket 방식)이 동작하지 않으므로 두 환경을 명시적으로 구분하여 export할 것.
- [ ] 1.5. Neon DB 관리자 콘솔에서 아래 DDL 스크립트를 실행합니다:
  ```sql
  -- 교회 마스터
  CREATE TABLE churches (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- 체크인 기록 (중복 방지 유니크 제약)
  CREATE TABLE checkins (
      id SERIAL PRIMARY KEY,
      church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
      phase_code VARCHAR(10) NOT NULL,
      is_all_arrived BOOLEAN NOT NULL DEFAULT FALSE,
      total_count INTEGER NOT NULL DEFAULT 0,
      report_notes TEXT,
      dynamic_questions JSONB,
      checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT unique_church_phase UNIQUE (church_id, phase_code)
  );

  -- 스캐너 세션 (church_id가 PK — sessionId 없는 결정적 QR 설계 반영)
  CREATE TABLE scanner_sessions (
      church_id INTEGER PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
      status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SCANNED | COMPLETED
      scanned_at TIMESTAMP WITH TIME ZONE,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );

  -- 시스템 전역 설정 (active_phase 관리)
  CREATE TABLE app_settings (
      key VARCHAR(50) PRIMARY KEY,
      value VARCHAR(100) NOT NULL,
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
  );
  -- 초기 활성 Phase 삽입
  INSERT INTO app_settings (key, value) VALUES ('active_phase', '1A');

  -- 성능 인덱스
  CREATE INDEX idx_checkins_phase_church ON checkins (phase_code, church_id);
  CREATE INDEX idx_checkins_checked_at ON checkins (phase_code, checked_in_at ASC);
  ```

---

## Phase 2: 코어 API 및 실시간 Edge 핸들러 (직렬 실행)

_목표: 비동기 데이터 조작을 위한 REST API 및 실시간 스트리밍(SSE) 엔드포인트 구축_

- [ ] 2.1. 유효하지 않은 스캔 발생 시 JSON 경보 메시지를 전송하는 Discord Webhook 유틸리티(`src/lib/discord.ts`)를 구현합니다.
- [ ] 2.2. 스캐너 세션 상태 관리 API(`app/api/sessions/route.ts`)를 작성합니다:
  - `POST /api/sessions` — QR 스캔 성공 시 `scanner_sessions` 테이블에서 해당 `church_id`의 상태를 `SCANNED`로 업데이트(없으면 insert).
  - 유효하지 않은 `churchId`이면 `lib/discord.ts`를 통해 Webhook 알림 발송.
- [ ] 2.3. 교회 리스트 및 체크인 CRUD API 라우트를 구축합니다:
  - `GET /api/churches` — 전체 교회 목록 조회
  - `POST /api/churches` — 신규 교회 추가 (관리자 전용)
  - `GET /api/checkins?phase=1A` — 특정 Phase 체크인 현황 조회
  - `POST /api/checkins` — 체크인 데이터 제출 (중복 시 DB 유니크 제약 위반 → `23505` 에러 캐치 후 `409` 응답 반환)
- [ ] 2.4. **[Critical]** 현재 활성 Phase 관리 API(`app/api/settings/phase/route.ts`)를 구현합니다:
  - `GET /api/settings/phase` — 현재 `active_phase` 값 조회
  - `PUT /api/settings/phase` — `active_phase` 값 변경 (관리자 전용)
- [ ] 2.5. **[Critical]** 모바일 화면 자동 전환용 Edge SSE API (`app/api/stream/mobile/route.ts`) 구현:
  - 파일 상단에 `export const runtime = 'edge';` 명시.
  - 쿼리 파라미터 `?churchId=X`를 받아, `scanner_sessions` 테이블에서 해당 `church_id`의 `status`가 `SCANNED`로 변경되는지 **1초 간격 폴링**으로 감시.
  - 상태 변화 감지 즉시 `data: SCANNED\n\n` 이벤트를 Push하고 스트림을 닫음.
  - 연결 시작 시 이미 `SCANNED` 상태이면 즉시 이벤트 발송 (다운로드 QR 사용 등 재접속 케이스 처리).
- [ ] 2.6. **[Critical]** 대시보드 현황판 동기화용 Edge SSE API (`app/api/stream/dashboard/route.ts`) 구현:
  - 파일 상단에 `export const runtime = 'edge';` 명시.
  - `active_phase`와 `checkins` 테이블의 최신 `checked_in_at`을 **2초 간격 폴링**으로 비교하여 신규 INSERT 발생 또는 `active_phase` 변경 감지 시 `data: REFRESH\n\n` 이벤트를 발송.
  - 클라이언트는 이벤트 수신 시 TanStack Query의 `invalidateQueries`를 호출하여 화면을 갱신.

---

## Phase 3: 프론트엔드 아키텍처 및 라우팅 기초 (직렬 실행)

_목표: 데이터 페칭 컨텍스트 설정 및 빈 페이지 스캐폴딩_

- [ ] 3.1. `src/app/providers.tsx` 파일에 TanStack Query Provider 세팅을 완료하고 `layout.tsx`에 래핑합니다.
- [ ] 3.2. 애플리케이션 전역에서 공통으로 사용할 레이아웃(상단 헤더, 전역 에러 Toast 알림 컴포넌트)을 생성합니다.
- [ ] 3.3. 아래 라우터 폴더 및 파일 구조를 스캐폴딩합니다:
  - `src/app/generate/page.tsx` (모바일 QR 생성 페이지)
  - `src/app/scanner/page.tsx` (PC 노트북 스캐너 페이지)
  - `src/app/checkin/[churchId]/page.tsx` (모바일 체크인 입력 폼 페이지 — **sessionId가 아닌 churchId**)
  - `src/app/dashboard/page.tsx` (실시간 체크인 현황 대시보드 페이지)
  - `src/app/admin/page.tsx` (반응형 수동 관리자 페이지)

---

## Phase 4: 개별 도메인 핵심 기능 구현 (병렬 실행 가능)

_목표: 사전에 정의된 타입 하네스(`types/index.ts`)를 기반으로 컴포넌트 고도화_

### Track A: 모바일 QR 코드 생성 도메인 `[병렬]`

- [ ] A.1. TanStack Query를 활용하여 Neon DB의 교회 목록을 가져와 직관적인 선택 Dropdown UI를 구현합니다.
- [ ] A.2. 사용자가 교회를 선택하면 `react-qr-code` 라이브러리를 사용하여 `{ churchId }` 데이터만을 포함한 결정적(Deterministic) QR 코드를 화면에 그립니다. QR 내용은 JSON 문자열 `'{"churchId":1}'` 형태를 사용합니다.
- [ ] A.3. HTML5 Canvas를 활용한 "QR 코드 이미지 다운로드" 기능을 완성합니다. 오프라인 환경에서 다운로드된 QR을 사용하더라도 스캐너는 `churchId`를 정상 인식합니다.
- [ ] A.4. QR 코드가 노출됨과 동시에 `/api/stream/mobile?churchId=X`로 SSE 연결을 개시합니다. `SCANNED` 이벤트를 수신하면 자동으로 `router.push('/checkin/[churchId]')`를 실행합니다. 컴포넌트 언마운트 시 SSE 연결을 명시적으로 닫습니다.

### Track B: 노트북 웹캠 스캐너 도메인 `[병렬]`

- [ ] B.1. `/scanner` 페이지 진입 시 `html5-qrcode` 카메라 비디오 스트림을 화면에 바인딩합니다. 개발 모드에서는 Phase 0.3의 `MockScannerPanel`을 웹캠 옆에 병행 노출합니다.
- [ ] B.2. 중복 연속 스캔 방지를 위해 QR이 최초 인식되는 순간 카메라 뷰를 즉시 숨기고 "인식 중..." 로딩 UI를 노출합니다.
- [ ] B.3. 정상 QR(`{"churchId": N}` 파싱 성공, DB에 존재하는 교회) 인 경우 `/api/sessions` POST를 호출하여 상태를 `SCANNED`로 업데이트합니다. API 처리 완료 후 2초 뒤 카메라 뷰를 재활성화합니다.
- [ ] B.4. 유효하지 않은 포맷이거나 DB에 없는 교회 데이터일 경우, 화면에 에러 툴팁을 띄우고 즉시 Discord Webhook 경보 알림을 발송합니다.
- [ ] B.5. 카메라 레이아웃 하단에 항시 배치되는 수동 "문제가 있어요" 관리자 호출 안내 UI를 구현합니다.

### Track C: 모바일 체크인 입력 폼 도메인 `[병렬]`

- [ ] C.1. `/checkin/[churchId]` 페이지 진입 시, Next.js 16의 `params`는 Promise이므로 `const { churchId } = await params` 형태로 처리합니다. 해당 교회가 현재 `active_phase`에서 이미 체크인을 마쳤는지 서버 사이드에서 확인하여 중복 진입 시 차단 화면을 노출합니다.
- [ ] C.2. 최상단에 `"안녕하세요 ${교회이름}교회 선교 대원 여러분..."` 동적 인사말 배너를 마운트합니다.
- [ ] C.3. 필수 입력 폼 컴포넌트 3종을 설계합니다 (모든 인원 도착 여부 체크박스, 현재 인원 수 숫자 전용 Input, 추가 보고 텍스트 영역).
- [ ] C.4. 하단 [완료] 버튼 클릭 시 TanStack Query의 `useMutation`을 통해 `POST /api/checkins`를 호출합니다. 성공 시 완료 축하 페이지로 라우팅하고, `409` 응답 수신 시 "이미 체크인 완료" 안내 화면으로 전환합니다.

### Track D: 대시보드 및 수동 어드민 도메인 `[병렬]`

- [ ] D.1. 대시보드 첫 로드 시 현재 `active_phase`와 해당 Phase의 도착/미도착 리스트 마스터 데이터를 서버 사이드에서 가져옵니다.
- [ ] D.2. `/api/stream/dashboard` SSE 엔드포인트와 커넥션을 연결하고, `REFRESH` 이벤트 수신 시 TanStack Query 데이터를 `invalidateQueries`하여 실시간 화면 갱신을 트리거합니다.
- [ ] D.3. 화면 상단에 현재 Phase 배지(예: `2일차 아침 · 2A`), 좌측(미도착 리스트), 우측(도착 리스트 — `${교회명}(${인원수})` 포맷)의 2분할 레이아웃을 반응형으로 세팅합니다.
- [ ] D.4. `/admin` 경로에 아래 기능을 포함한 반응형 UI를 구축합니다:
  - **Phase 전환**: 8개 Phase 코드(`1A`~`4P`) 선택 UI. 선택 즉시 `PUT /api/settings/phase`를 호출하여 전체 시스템 Phase를 전환합니다.
  - **신규 교회 추가**: `POST /api/churches`를 통한 현장 즉시 추가.
  - **수동 강제 체크인**: 교회 선택 + 인원수 입력 후 `POST /api/checkins`로 현재 `active_phase` 기준으로 강제 체크인 처리.

---

## Phase 5: 통합 테스트 및 품질 폴리싱 (직렬 실행)

_목표: 프로덕션 배포 전 E2E 연동 무결성 테스트 및 UI 최종 정리_

- [ ] 5.1. **[하네스 테스트]** 모바일 QR 생성 탭에서 Payload 텍스트 복사 → PC 스캐너 탭의 `MockScannerPanel`에 붙여넣기 후 트리거 → 모바일 탭이 Form으로 자동 전환 → Form 제출 → 대시보드 탭에 실시간 리스트업되는 전체 무결성 흐름을 개발자 단독 E2E 테스트로 검증합니다.
- [ ] 5.2. Edge SSE의 브라우저 표준 자동 재연결(Auto-reconnect) 명세를 검증하여 연결이 끊겼을 때 시스템이 복구되는지 확인합니다. 모바일 SSE는 체크인 완료 후 명시적으로 연결을 닫아 리소스를 해제합니다.
- [ ] 5.3. Lovable로 생성된 Tailwind CSS 컴포넌트를 각 도메인 페이지에 바인딩합니다. **Tailwind CSS v4 호환 여부를 반드시 확인**하고, v3 유틸리티 클래스(예: 커스텀 색상 설정 방식)는 v4 `@theme` 방식으로 변환합니다.
- [ ] 5.4. 고의로 잘못된 포맷의 임의 문자열을 스캐너에 입력하여 Discord 채널로 실시간 Webhook 알림 메시지가 정확히 도달하는지 검증합니다.
- [ ] 5.5. `scanner_sessions` 테이블의 오래된 PENDING 레코드 정리를 확인합니다. 관리자가 Phase를 전환할 때 이전 Phase의 PENDING 세션을 일괄 정리하는 로직을 `PUT /api/settings/phase` 핸들러 내부에 포함시킵니다.
