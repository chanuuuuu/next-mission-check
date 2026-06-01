# 선교 등록 관리 시스템 구현 플랜

## 🎯 AI 에이전트 작업 지침

- **기술 스택**: Next.js 16 (App Router), Neon DB (neon() HTTP 드라이버), TanStack Query v5, Tailwind CSS v4
- **중요 — 기존 프로젝트 통합**: 새 프로젝트가 아닌 기존 체크인 시스템에 라우트를 추가합니다. `src/lib/db.ts`, `src/lib/discord.ts` 등 기존 유틸리티를 재사용하세요.
- **중요 — 런타임 분기**: `googleapis`와 `bcryptjs`는 Node.js 전용입니다. `sync/manual/route.ts`에만 `runtime = 'edge'` 없음. 나머지 inquery API 전부 `export const runtime = 'edge'` 선언.
- **중요 — Next.js 16 Breaking Changes**: `params`는 Promise입니다. 서버 컴포넌트에서 `const { id } = await params`, 클라이언트 컴포넌트에서 `use(params)`.
- **중요 — 타입 안전성**: `neon()` 템플릿 리터럴은 `any[]`를 반환합니다. 반드시 `as MissionRegistration[]`으로 명시적 cast 하세요.
- **경로 네이밍**: 기존 `/admin`은 체크인 시스템 전용입니다. 이 시스템의 관리자 페이지는 `/inquiry/admin`을 사용합니다.
- **환경변수 주의**: `.env.local`의 bcrypt 해시값(`$2b$10$...`)은 `\$` 이스케이프 필수. Vercel에서도 동일.

---

## Phase 0: 인프라 및 공통 타입 준비

- [x] 0.1. 패키지 추가 (`googleapis`, `bcryptjs`, `@types/bcryptjs`)
- [x] 0.2. Neon DB DDL 실행 (`mission_registrations` 테이블 + 인덱스)
  - 추가 DDL (세션 중 실행 필요):
    ```sql
    ALTER TABLE mission_registrations ADD COLUMN schedule_survey VARCHAR NULL;
    ALTER TABLE mission_registrations ADD COLUMN use_car_during_mission VARCHAR NULL;
    -- use_car_during_mission은 boolean이 아닌 VARCHAR (폼 원문 저장)
    ```
- [x] 0.3. 환경변수 추가 (`.env.local`)
- [x] 0.4. 공통 타입 정의 (`src/types/index.ts`)
  - `MissionRegistration` 인터페이스 (현재 필드):
    - `use_personal_car: boolean | null` — 서울→영동 자차 여부
    - `use_car_during_mission: string | null` — 선교 중 자차 (원문 VARCHAR, "네(자차만 이용)" 등)
    - `use_return_bus: boolean | null` — 영동→서울 교회버스 여부
    - `schedule_survey: string | null` — 참여 일정 및 이동수단 조사 (원문)
    - `arrival_time: string | null` — 도착 예상시간 (원문, 파싱 필요)
  - `FormMappingConfig` 인터페이스
- [x] 0.5. `src/config/form-mapping.ts` — 부서별 폼 컬럼명 매핑
  - 키워드 부분 매칭 (`k.includes(keyword)`) 방식
  - `use_car_during_mission`은 raw string 저장 (parseBooleanField 사용 안 함)
- [x] 0.6. `src/config/departments.ts` — 부서 계층 정적 config
  - 2청: 1~6진 → 팀 (2진은 5팀, 나머지 6팀)
  - 기타부서: 서울역 사랑나눔부 / POP / 교역자 / 주방팀 / 방송팀 / 사진팀 / 준비팀 (sub2 없음)
  - 청장년: 1~6진 → 연계교회명 (sub2가 교회명)

---

## Phase 1: API 레이어

- [x] 1.1. `GET /api/inquery/registrations/departments` — **현재 미사용** (정적 config로 대체됨)
- [x] 1.2. `GET /api/inquery/registrations` — 등록 조회
  - `sub_department_1` 없으면 부서 전체 조회 (어드민용)
  - 반환 필드: `schedule_survey`, `use_car_during_mission` 포함
- [x] 1.3. `PATCH /api/inquery/registrations/[id]/payment` — 납부 토글
- [x] 1.4. `POST /api/inquery/registrations` — 수동 대원 추가
- [x] 1.5. `POST/DELETE /api/inquery/auth` — PIN 인증/로그아웃

---

## Phase 2: 구글 시트 연동 파이프라인

- [x] 2.1. `POST /api/inquery/sync/webhook` — GAS 웹훅 수신
  - `use_car_during_mission`: raw string 저장 (parseBooleanField 미사용)
- [x] 2.2. `POST /api/inquery/sync/manual` — 수동 강제 동기화
  - `use_car_during_mission` 포함하여 Upsert
- [x] 2.3. `worktree/inquery/gas_webhook_template.gs` — GAS 스크립트 템플릿

---

## Phase 3: 사용자 조회 화면 `/inquiry`

- [x] 3.1. `app/inquiry/page.tsx` — 서버 컴포넌트
- [x] 3.2. `app/inquiry/InquiryClient.tsx`
  - 정적 config 기반 Cascading Select (API 호출 없음)
  - 조회 후 필터 접힘/펼치기 (모바일 UX)
  - 동일 조건 재조회 시 `refetch()` 호출
  - `staleTime: 0`
  - 100vh 레이아웃: header + filter 고정, 리스트 `flex-1 overflow-y-auto`
- [x] 3.3. `src/components/inquery/registration-list.tsx` — 공통 리스트 컴포넌트
  - `renderPayment` render prop으로 납부 UI 분리
  - `PaymentBadge` (읽기 전용), `PaymentToggle` (어드민용)
  - 이동수단 표시: 서울→영동 / 도착 예상시간 / 영동→서울 / 선교중 자차사용
  - `parseArrivalTime`: 번호(`1) `) + 식사 정보 괄호 제거
  - `parseCarDuringMission`: "네(...)" → "O", "아니오(...)" → "X"
- [x] 3.4. `src/components/inquery/registration-filters.tsx`
  - 정적 config 사용, useQuery 제거
  - 본부서·소속1·소속2 미선택 시 조회 버튼 비활성
  - select/input `text-base`(16px) — iOS focus 확대 방지
- [x] 3.5. `app/inquiry/layout.tsx` — GNB 제거, Toaster만 유지
- [x] 3.6. `app/page.tsx` — `/` → `/inquiry` 리다이렉트

---

## Phase 4: 관리자 화면 `/inquiry/admin`

- [x] 4.1. `middleware.ts` → `proxy.ts` (Next.js 16 네이밍) — 인증 가드
- [x] 4.2. `app/inquiry/admin/login/page.tsx` — PIN 로그인
- [x] 4.3. `app/inquiry/admin/page.tsx` — 서버 컴포넌트 (2청 초기 데이터)
- [x] 4.4. `app/inquiry/admin/AdminClient.tsx`
  - 공통 `RegistrationList` + `PaymentToggle` 사용
  - 100vh 레이아웃 동일 적용
  - 수동 동기화 버튼 (토스트 피드백)
- [x] 4.5. 납부 토글 낙관적 업데이트 (`useMutation`)
- [x] 4.6. `AddMemberModal.tsx` — 수동 대원 추가 모달

---

## Phase 5: 통합 테스트 및 배포

- [x] 5.1. 웹훅 curl 테스트 (3개 부서)
- [x] 5.2. NULLS NOT DISTINCT 제약 검증
- [x] 5.3. 수동 동기화 테스트 (schedule_survey 누락 버그 수정 포함)
- [x] 5.6. 관리자 인증 플로우 검증 (bcryptjs edge runtime 버그, 쿠키 path 버그 수정)
- [x] 5.7. 납부 토글 낙관적 업데이트 검증 (확인 모달 추가)
- [x] 5.8. Vercel 환경변수 등록 및 배포
- [ ] 5.4. GAS 연동 사전 준비
  - 각 시트 마지막 열에 `동기화 상태` 컬럼 추가 (헤더만, 값은 자동 기입)
  - GAS 스크립트 편집기에서 Script Properties 등록:
    - `WEBHOOK_URL` = `https://<vercel-domain>/api/inquery/sync/webhook`
    - `WEBHOOK_SECRET` = `openssl rand -hex 32` 으로 생성한 랜덤 문자열
    - `DISCORD_WEBHOOK_URL` = Discord webhook URL (선택)
  - Vercel 환경변수에도 동일한 `WEBHOOK_SECRET` 값 등록 필수
- [ ] 5.5. GAS 트리거 등록 (3개 부서 스프레드시트 각각)
  - 트리거 유형: **스프레드시트 기반 → 폼 제출 시** (Forms 기반 아님)
  - 실행 함수: `onFormSubmit`

---

## 미구현 (v2)

- 관리자 대원 수정/삭제
- 조회 페이지 CSV 다운로드
- 납부 일괄 처리
