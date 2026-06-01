# 선교 등록 관리 시스템 구현 플랜

## 🎯 AI 에이전트 작업 지침

- **기술 스택**: Next.js 16 (App Router), Neon DB (neon() HTTP 드라이버), TanStack Query v5, Tailwind CSS v4
- **중요 — 기존 프로젝트 통합**: 새 프로젝트가 아닌 기존 체크인 시스템에 라우트를 추가합니다. `src/lib/db.ts`, `src/lib/discord.ts` 등 기존 유틸리티를 재사용하세요.
- **중요 — 런타임 분기**: `googleapis`와 `bcryptjs`는 Node.js 전용입니다. 이를 사용하는 route handler에 `export const runtime = 'edge'`를 **절대 선언하지 마세요**.
- **중요 — Next.js 16 Breaking Changes**: `params`는 Promise입니다. 서버 컴포넌트에서 `const { id } = await params`, 클라이언트 컴포넌트에서 `use(params)`.
- **중요 — 타입 안전성**: `neon()` 템플릿 리터럴은 `any[]`를 반환합니다. 반드시 `as MissionRegistration[]`으로 명시적 cast 하세요.
- **경로 네이밍**: 기존 `/admin`은 체크인 시스템 전용입니다. 이 시스템의 관리자 페이지는 `/inquiry/admin`을 사용합니다.
- **실행 및 체크**: 각 단계를 완수할 때마다 `[ ]`를 `[x]`로 업데이트. Phase 종료 시 사용자에게 보고 후 승인을 받을 것.

---

## Phase 0: 인프라 및 공통 타입 준비 (직렬 실행)

_목표: DB 테이블 생성, 패키지 추가, 공통 타입 정의_

- [x] 0.1. **패키지 추가 설치**:
  ```bash
  npm install googleapis bcryptjs
  npm install --save-dev @types/bcryptjs
  ```

- [ ] 0.2. **Neon DB DDL 실행**: `db_schema.md` Section 3의 DDL 스크립트를 Neon 콘솔에서 실행합니다.
  - `mission_registrations` 테이블 생성 (`NULLS NOT DISTINCT` 포함)
  - 3개 인덱스 생성 (`idx_mr_dept`, `idx_mr_payment`, `idx_mr_name`)

- [ ] 0.3. **환경변수 추가**: `.env.local`에 `tech_stack.md` Section 7의 변수를 추가합니다.
  - `ADMIN_PIN_HASH`: `node -e "const b=require('bcryptjs'); console.log(b.hashSync('YOUR_PIN', 10))"` 으로 생성
  - Google Sheets 관련 5개 변수

- [x] 0.4. **공통 타입 추가**: `src/types/index.ts`에 아래 인터페이스를 추가합니다.
  ```ts
  export interface MissionRegistration {
    id: string
    department_main: string
    sub_department_1: string
    sub_department_2: string | null
    small_group: string | null
    name: string
    phone_last_four: string
    church_name: string | null
    arrival_time: string | null
    use_personal_car: boolean | null
    use_return_bus: boolean | null
    payment_status: boolean
    created_at: string
    updated_at: string
  }

  export interface FormMappingValue {
    sub_department_1: string
    sub_department_2: string | null
    small_group: string | null
    name: string
    phone_last_four: string
    church_name: string | null
    arrival_time: string
    use_personal_car: string
    use_return_bus: string
  }
  ```

- [x] 0.5. **FORM_MAPPINGS 상수 파일 생성**: `src/config/form-mapping.ts`를 생성합니다.
  ```ts
  export const FORM_MAPPINGS: Record<string, FormMappingValue> = {
    "2청": {
      sub_department_1: "소속부서(진)",
      sub_department_2: "소속부서(팀)",
      small_group: null,
      name: "이름",
      phone_last_four: "핸드폰 번호",
      church_name: "연계교회 이름",
      arrival_time: "도착 예상시간",
      use_personal_car: "자차를 가져 오시나요",
      use_return_bus: "교회 버스에 탑승하시나요",
    },
    기타부서: { ... },
    청장년: { ... },
  }
  ```
  각 부서의 전체 매핑 값은 `prd.md` Section 3.3을 참조합니다.

---

## Phase 1: API 레이어 구축 (직렬 실행)

_목표: 조회·수정·인증 REST API 엔드포인트 구현_

- [x] 1.1. **Cascading Dropdown API** (`app/api/inquery/registrations/departments/route.ts`):
  - `GET /api/inquery/registrations/departments?department_main=X&sub_department_1=Y`
  - `department_main`만 주어진 경우: `sub_department_1` 목록 반환
  - `sub_department_1`까지 주어진 경우: `sub_department_2` 목록 반환 (빈 배열이면 Step 3 불필요)

- [x] 1.2. **등록 조회 API** (`app/api/inquery/registrations/route.ts`):
  - `GET /api/inquery/registrations?department_main=&sub_department_1=&sub_department_2=&name=`
  - `db_schema.md` Section 5.3~5.4 쿼리 사용
  - `sub_department_2` 파라미터가 빈 문자열인 경우 `IS NULL` 조건으로 처리

- [x] 1.3. **납부 상태 토글 API** (`app/api/inquery/registrations/[id]/payment/route.ts`):
  - `PATCH /api/inquery/registrations/[id]/payment`
  - `db_schema.md` Section 5.6 쿼리 사용
  - 응답: `{ id, payment_status }` (낙관적 업데이트 롤백 기준)

- [x] 1.4. **수동 대원 추가 API** — 1.2 `POST /api/inquery/registrations`에 추가:
  - Body: `MissionRegistration` 전체 필드 (payment_status 제외)
  - `db_schema.md` Section 5.7 Upsert 쿼리 사용

- [x] 1.5. **관리자 인증 API** (`app/api/inquery/auth/route.ts`):
  - `POST /api/inquery/auth` — PIN 입력 → `bcryptjs.compare` → 성공 시 `HttpOnly` 쿠키(`inquery_admin_session`) 발급, 실패 시 401
  - `DELETE /api/inquery/auth` — 쿠키 삭제 (로그아웃)
  - 이 라우트에는 `export const runtime` 선언 없음 (Node.js 기본값)

---

## Phase 2: 구글 시트 연동 파이프라인 (직렬 실행)

_목표: 실시간 웹훅 수신 및 수동 강제 동기화 구현_

- [x] 2.1. **웹훅 수신 API** (`app/api/inquery/sync/webhook/route.ts`):
  - `POST /api/inquery/sync/webhook`
  - Body: `{ department: string, data: Record<string, string> }`
  - `FORM_MAPPINGS[department]`로 필드 매핑 후 Upsert
  - 알 수 없는 department 또는 필수 필드 누락 시 Discord Webhook 경보 발송 (`src/lib/discord.ts` 재사용)

- [x] 2.2. **수동 동기화 API** (`app/api/inquery/sync/manual/route.ts`):
  - `POST /api/inquery/sync/manual`
  - 인증 쿠키(`inquery_admin_session`) 검증 필수
  - 아래 순서로 처리:
    1. `googleapis`로 3개 시트 전체 rows 조회
    2. 각 row에 `FORM_MAPPINGS` 적용하여 DB 컬럼으로 변환
    3. Neon DB에 Upsert (bulk insert with `ON CONFLICT`)
    4. 처리 완료 행의 `[동기화 상태]` 컬럼을 `SUCCESS`로 시트에 Write back
  - 응답: `{ synced: number, failed: number }` — 어드민 토스트용

- [x] 2.3. **GAS 웹훅 스크립트 템플릿 작성** (`worktree/inquery/gas_webhook_template.gs`):
  - `onSubmit(e)` 함수: `e.namedValues` 파싱 → POST `/api/inquery/sync/webhook`
  - 지수 백오프 3회 재시도
  - 3회 실패 시 `[동기화 상태]` 컬럼 = `FAIL` 마킹 + Discord Webhook 직접 호출
  - 이 파일은 코드 참조용이며 Next.js 빌드에 포함되지 않음

---

## Phase 3: 사용자 조회 화면 `/inquiry` (직렬 실행)

_목표: Cascading Dropdown → 결과 리스트 노출_

- [x] 3.1. **서버 컴포넌트 스캐폴딩** (`app/inquiry/page.tsx`):
  - Server Component로 작성
  - 최초 렌더 시 부서 대분류 목록(2청 / 기타부서 / 청장년) 하드코딩으로 전달 (DB 조회 불필요)
  - `InquiryClient` 클라이언트 컴포넌트로 나머지 로직 위임

- [x] 3.2. **Cascading Select UI** (`app/inquiry/InquiryClient.tsx`):
  - Step 1: 대분류 선택 (2청 / 기타부서 / 청장년) — 하드코딩
  - Step 2: `useQuery`로 `sub_department_1` 목록 조회, 드롭다운 렌더
  - Step 3: `sub_department_2` 목록 조회 — 빈 배열 응답 시 Step 3 UI 표시 안 함
  - Step 4: 이름 입력 텍스트 필드 (선택 사항)
  - 각 Step 선택 시 하위 Step 초기화

- [x] 3.3. **결과 리스트 렌더링**:
  - Step 2 이상 선택 시 `useQuery`로 등록 데이터 조회
  - 결과 카드 노출 항목: 이름, 소속 정보, 도착 예상 시간, 자차·버스 여부, 소속 목장(청장년), 연계교회(2청), **납부 여부 뱃지**
  - 납부 완료: 초록 뱃지 `납부 완료`, 미납: 회색 뱃지 `미납`
  - 동명이인이 여러 명일 경우 모두 노출 (수정 기능 없음 — 읽기 전용)
  - 결과 0건: "검색 결과가 없습니다" 빈 상태 UI

---

## Phase 4: 관리자 화면 `/inquiry/admin` (직렬 실행)

_목표: 인증 → 납부 상태 관리 + 수동 동기화_

- [x] 4.1. **인증 가드 미들웨어 설정**:
  - `middleware.ts`에서 `/inquiry/admin` 경로 접근 시 `inquery_admin_session` 쿠키 검증
  - 쿠키 없거나 만료 시 `/inquiry/admin/login`으로 리다이렉트

- [x] 4.2. **로그인 페이지** (`app/inquiry/admin/login/page.tsx`):
  - PIN 입력 폼 (숫자 키패드 or 일반 input)
  - `POST /api/inquery/auth` 호출 → 성공 시 `/inquiry/admin`으로 이동, 실패 시 에러 메시지

- [x] 4.3. **관리자 메인 레이아웃** (`app/inquiry/admin/page.tsx`):
  - Server Component: 초기 전체 목록을 `department_main='2청'` 기본값으로 미리 조회하여 props 전달
  - `AdminClient` 클라이언트 컴포넌트에 데이터 위임

- [x] 4.4. **부서 탭 + 이름 검색** (`app/inquiry/admin/AdminClient.tsx`):
  - 상단: 2청 / 기타부서 / 청장년 탭 — 탭 전환 시 `useQuery` 재조회
  - 탭 옆: 이름 검색 input — debounce(300ms) 후 쿼리 파라미터로 전달
  - 우측 상단: **[동기화]** 버튼 (로딩 스피너 + 성공/실패 토스트) + **[대원 추가]** 버튼

- [x] 4.5. **납부 토글** (AdminClient 내):
  - `useMutation` + 낙관적 업데이트: 클릭 즉시 UI 반전 → 백그라운드 `PATCH` 호출
  - API 실패 시 롤백 + 에러 토스트

- [x] 4.6. **수동 대원 추가 모달**:
  - 부서 선택 → 세부 부서(cascading) → 나머지 필드 입력 폼
  - `POST /api/inquery/registrations` 호출 → 성공 시 `invalidateQueries` 후 모달 닫기

---

## Phase 5: 통합 테스트 및 GAS 트리거 등록 (직렬 실행)

_목표: 웹훅 end-to-end 검증 및 프로덕션 준비_

- [ ] 5.1. **웹훅 로컬 테스트**:
  - `worktree/inquery/gas_webhook_template.gs`의 페이로드 형식으로 `curl` 또는 Postman으로 POST 테스트
  - 2청 / 기타부서 / 청장년 각각 1건씩 전송하여 DB Upsert 확인
  - 동일 키로 재전송 시 `payment_status`가 유지되는지 확인

- [ ] 5.2. **NULLS NOT DISTINCT 제약 검증**:
  - 기타부서 동일 대원 2회 제출 시 레코드가 1건만 존재하는지 확인
  - PostgreSQL 에러 코드 `23505` 발생 여부 확인 (Upsert이므로 에러 없어야 함)

- [ ] 5.3. **수동 동기화 테스트**:
  - `/inquiry/admin`에서 [동기화] 버튼 클릭 → 응답 `{ synced, failed }` 토스트 확인
  - 구글 시트 `[동기화 상태]` 컬럼에 `SUCCESS` 마킹 확인

- [ ] 5.4. **GAS 연동 사전 준비** (트리거 등록 전 필수):

  **a. 각 구글 시트에 `[동기화 상태]` 컬럼 수동 추가**
  - 3개 부서 폼 응답 스프레드시트 각각에 헤더 행 맨 우측에 `동기화 상태` 컬럼을 직접 추가합니다.
  - 수동 동기화(manual sync)가 이 컬럼에 `SUCCESS`를 Write back 하므로, 컬럼이 없으면 기록이 누락됩니다.

  **b. GAS Script Properties에 Discord Webhook URL 저장**
  - Apps Script 편집기 → 좌측 메뉴 **프로젝트 설정(⚙)** → **스크립트 속성** → 속성 추가
  - 속성 이름: `DISCORD_WEBHOOK_URL`, 값: Discord Webhook URL 입력
  - GAS 스크립트가 웹훅 실패 시 `PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL')`로 이 값을 읽습니다.

  **c. Vercel 배포 완료 후 GAS 웹훅 URL 교체**
  - `gas_webhook_template.gs`의 `WEBHOOK_URL` 상수를 로컬호스트가 아닌 **Vercel 배포 도메인**으로 교체합니다.
  - `const WEBHOOK_URL = 'https://[YOUR_DOMAIN]/api/inquery/sync/webhook'`
  - GAS는 로컬 개발 서버에 접근할 수 없으므로, 반드시 배포 후 실제 URL을 사용해야 합니다.

- [ ] 5.5. **각 부서 GAS 트리거 등록** (`tech_stack.md` Section 5 참조):
  - 2청, 기타부서, 청장년 3개 폼 응답 시트에 `onFormSubmit` 트리거 등록
  - 트리거 설정: **이벤트 소스 = 스프레드시트에서 / 이벤트 유형 = 양식 제출 시**
  - ⚠️ `FormApp` 기반 트리거(`Forms에서`)가 아닌 **`Spreadsheet` 기반 트리거**여야 `e.namedValues`가 제공됩니다.

- [ ] 5.6. **관리자 인증 플로우 검증**:
  - 쿠키 없이 `/inquiry/admin` 직접 접근 → `/inquiry/admin/login` 리다이렉트 확인
  - 틀린 PIN 입력 → 401 에러 메시지 확인
  - 올바른 PIN → 쿠키 발급 → 관리자 화면 접근 확인

- [ ] 5.7. **납부 토글 낙관적 업데이트 검증**:
  - 토글 클릭 즉시 UI 반전 확인
  - 네트워크 탭에서 PATCH 요청 후 DB 실제 반영 확인
  - 의도적으로 API를 실패시켜 롤백 동작 확인

- [ ] 5.8. **v2 명세서 작성 (구현 보류 항목)**:
  - 관리자의 대원 수정 (이름, 연락처, 부서 변경)
  - 관리자의 대원 삭제
  - 조회 페이지 CSV 다운로드
  - 납부 일괄 처리 (전체 납부 체크)
