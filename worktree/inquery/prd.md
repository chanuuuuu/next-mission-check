# 📄 선교 등록 관리 시스템 PRD

## 1. 프로젝트 개요 (Project Overview)

본 프로젝트는 여러 부서(2청, 기타부서, 청장년)에서 구글 폼으로 개별 수집 중인 선교 등록 데이터를 중앙화하여 관리하는 웹 애플리케이션입니다.
선교 대원들은 본인의 등록 내역을 실시간으로 조회할 수 있으며, 관리자는 등록비 납부 여부를 관리하고 누락된 폼 응답 데이터를 수동으로 동기화하여 데이터 정합성을 100% 보장합니다.

## 2. 시스템 아키텍처 및 기술 스택

Next.js App Router의 라우트별 런타임(Edge/Node) 혼합 구성을 통해 실시간성과 안정성을 동시에 확보합니다.

### 2.1 Core 인프라 및 프레임워크

- **Framework:** Next.js (App Router, v14 이상)
- **Deployment:** Vercel (Hobby 또는 Pro 요금제)
- **Database:** Neon DB (Serverless PostgreSQL) + PgBouncer(Connection Pooling)
- **ORM:** Drizzle ORM (타입 안정성 및 서버리스 환경 최적화)

### 2.2 하이브리드(Hybrid) 런타임 구성 전략 (Core Architecture)

Vercel Serverless 환경의 제약(타임아웃)과 Node.js 생태계 의존성을 모두 해결하기 위해, 라우트별 파일 상단에 `export const runtime`을 선언하여 역할을 명확히 분리합니다.

- **✅ Node.js Serverless Runtime (기본값)**
  - **적용 라우트:**
    - `app/api/sync/webhook/route.ts` (구글 폼 웹훅 수신 및 DB Upsert)
    - `app/api/sync/manual/route.ts` (Google Sheets API 호출 및 강제 동기화)
    - `app/api/auth/route.ts` (관리자 암호 검증 및 세션/쿠키 발급)
  - **기술적 이유:** `googleapis` (구글 시트 연동), `bcrypt` (비밀번호 해싱), DB 트랜잭션 등 Node.js 내장 모듈(`fs`, `crypto` 등)에 의존하는 라이브러리를 제약 없이 안정적으로 사용하기 위함입니다. Vercel 타임아웃(10~15초) 내에 충분히 처리 가능한 무거운 작업들을 담당합니다.

- **⚡ Edge Runtime (V8)**
  - **적용 라우트:**
    - `app/api/stream/route.ts` (SSE 기반 실시간 통신 파이프라인)
    - `app/(pages)/...` (SSR을 통해 화면을 그려주는 일반 페이지 뷰)
  - **기술적 이유:** SSE(Server-Sent Events)를 통해 실시간으로 지속적인 연결을 유지해야 할 때 Vercel Serverless 함수의 타임아웃 제약에 걸려 끊어지는 현상을 방지합니다. Edge Runtime을 적용하면 타임아웃 제약을 우회하면서도 콜드 스타트 없이 가볍고 빠르게 스트리밍 연결을 유지할 수 있습니다.

### 2.3 클라이언트 및 상태 관리

- **Data Fetching/State:** TanStack Query v5 (`useMutation`, `invalidateQueries` 활용)
- **UI/Styling:** Tailwind CSS (반응형 모바일/PC 호환)
- **Alerts:** Discord Webhook API (서버 장애 및 동기화 누락 알림)

---

## 3. 데이터베이스 및 스키마 설계

### 3.1 구글 폼 수집 항목 명세

각 부서별로 수집하는 원본 데이터 항목은 다음과 같습니다.

1. **2청:** 이름, 핸드폰 번호(맨 뒤 네자리), 소속부서(진), 소속부서(팀), 연계교회 이름, 연계교회 도착 예상시간, 자차 이용 여부, 교회 버스 탑승 여부
2. **기타부서:** 이름, 핸드폰 번호(맨 뒤 네자리), 소속부서, 연계교회 도착 예상시간, 자차 이용 여부, 교회 버스 탑승 여부
3. **청장년:** 이름, 핸드폰 번호(맨 뒤 네자리), 세부소속(진), 소속 목장, 연계교회 이름, 연계교회 도착 예상시간, 자차 이용 여부, 교회 버스 탑승 여부

### 3.2 `Mission_Registrations` 테이블

위 수집 항목들을 2계층의 세부 부서 구조(`sub_department_1`, `sub_department_2`)로 정규화하여 통합 관리합니다.

| 컬럼명 (Column)    | 데이터 타입  | 제약 조건 (Constraints)         | 설명                                            |
| :----------------- | :----------- | :------------------------------ | :---------------------------------------------- |
| `id`               | `UUID`       | PK, Default `gen_random_uuid()` | 레코드 고유 식별자                              |
| `department_main`  | `VARCHAR`    | NOT NULL                        | 대분류 (2청, 기타부서, 청장년)                  |
| `sub_department_1` | `VARCHAR`    | NOT NULL                        | 세부 부서 1계층 (진, 소속부서)                  |
| `sub_department_2` | `VARCHAR`    | NULL                            | 세부 부서 2계층 (2청: 팀 / 청장년: 연계교회)    |
| `small_group`      | `VARCHAR`    | NULL                            | 소그룹 (청장년의 '소속 목장' 등 보존용)         |
| `name`             | `VARCHAR`    | NOT NULL                        | 이름                                            |
| `phone_last_four`  | `VARCHAR(4)` | NOT NULL                        | 휴대폰 번호 뒤 4자리                            |
| `church_name`      | `VARCHAR`    | NULL                            | 연계교회 이름 (2청 전용, 청장년은 sub_2에 포함) |
| `arrival_time`     | `VARCHAR`    | NULL                            | 도착 예상 시간                                  |
| `use_personal_car` | `BOOLEAN`    | NULL                            | 자차 이용 여부                                  |
| `use_return_bus`   | `BOOLEAN`    | NULL                            | 복귀 시 버스 탑승 여부                          |
| `payment_status`   | `BOOLEAN`    | NOT NULL, Default `FALSE`       | **[관리자 전용]** 납부 여부                     |
| `created_at`       | `TIMESTAMP`  | Default `NOW()`                 | 최초 등록 일시                                  |
| `updated_at`       | `TIMESTAMP`  | Default `NOW()`                 | 최근 수정 일시                                  |

> **🔥 핵심 정책: 데이터 덮어쓰기 (Upsert) 조건**
>
> 1. `sub_department_1`, `sub_department_2`, `name`, `phone_last_four` 4개의 컬럼을 **복합 유니크 키(Composite Unique Key)** 로 설정합니다. (단, `sub_department_2`가 NULL인 경우도 Unique 평가에 포함)
> 2. 웹훅이나 수동 동기화를 통해 동일한 유저가 데이터를 재제출한 경우 `ON CONFLICT` 구문을 사용하여 데이터를 덮어씁니다(Update).
> 3. **단, 덮어쓰기 시 `payment_status` 컬럼은 제외**하여 관리자가 체크한 납부 상태가 초기화되지 않도록 철저히 격리합니다.

### 3.3 동적 컬럼 매핑 객체 (`config/form-mapping.ts`)

구글 시트의 가변적인 컬럼명을 애플리케이션의 DB 스키마와 1:1로 매핑합니다. (문자열 포함 여부로 판단)

```typescript
export const FORM_MAPPINGS = {
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
  기타부서: {
    sub_department_1: "소속부서",
    sub_department_2: null,
    small_group: null,
    name: "이름",
    phone_last_four: "핸드폰 번호",
    church_name: null,
    arrival_time: "도착 예상시간",
    use_personal_car: "자차를 가져 오시나요",
    use_return_bus: "교회 버스에 탑승하시나요",
  },
  청장년: {
    sub_department_1: "세부소속(진)",
    sub_department_2: "연계교회 이름", // 그룹핑 기준 변경 적용
    small_group: "소속 목장", // 기존 데이터 보존
    name: "이름",
    phone_last_four: "핸드폰 번호",
    church_name: null, // sub_department_2와 중복되므로 null 처리
    arrival_time: "도착 예상시간",
    use_personal_car: "자차를 가져 오시나요",
    use_return_bus: "교회 버스에 탑승하시나요",
  },
};
```

## 4. 데이터 동기화 파이프라인 (Data Pipeline)

### 4.1 실시간 동기화 (Event-Driven Webhook)

- **발신 (Google Apps Script):** 폼 제출 시 `onSubmit` 트리거 발생. `e.namedValues`에서 매핑된 필수 정보만 파싱하여 Next.js 서버로 `POST` 요청.
- **수신 (Next.js Node 런타임):** `app/api/sync/webhook/route.ts` 에서 페이로드 검증 후 Neon DB에 Upsert 수행.
- **1차 방어 (GAS단):** 전송 실패 시 `try-catch` 및 `Utilities.sleep()`을 통해 최대 3회 지수 백오프(Exponential backoff) 재시도 수행.

### 4.2 장애 방어 및 에러 핸들링 (Dead-Letter)

- 3회 재시도에도 실패할 경우, GAS가 엑셀 시트 맨 우측 `[동기화 상태]` 컬럼에 `FAIL` 마킹.
- **Discord 알림:** 즉시 Discord Webhook을 통해 `[장애] {부서} {이름} 동기화 실패` 알림 전송.

### 4.3 수동 복구 동기화 (Manual Sync)

- **기능:** 관리자 페이지 상단의 **[누락 데이터 강제 동기화]** 버튼.
- **동작 (Node 런타임):** `app/api/sync/manual/route.ts` API 호출.
- Google Sheets API를 통해 시트 전체 데이터를 조회(`googleapis` 라이브러리 사용).
- DB와 대조하여 누락된 Row 삽입 및 변경된 Row 업데이트 수행. (수행 완료 후 해당 시트 행의 `[동기화 상태]`를 `SUCCESS`로 갱신).

### 4.4 Google Sheets API 연동 및 웹훅 등록 가이드

#### A. Google Sheets API 연동 (수동 동기화용)

1. **GCP 프로젝트 설정:** Google Cloud Console 접속 -> 새 프로젝트 생성.
2. **API 활성화:** `API 및 서비스` -> `라이브러리`에서 `Google Sheets API` 검색 후 활성화.
3. **서비스 계정 생성:** `사용자 인증 정보` -> `사용자 인증 정보 만들기` -> `서비스 계정` 생성.
4. **키 발급:** 생성된 서비스 계정 클릭 -> `키` 탭 -> `새 키 만들기(JSON)` 클릭 후 다운로드. (이 내용을 `.env`의 `GOOGLE_PRIVATE_KEY` 등에 사용)
5. **권한 부여:** 다운로드된 JSON 파일 내의 `client_email` 주소를 복사하여, 동기화할 **각 부서의 구글 폼 응답 스프레드시트 우측 상단 [공유]** 버튼을 누르고 편집자로 추가.

#### B. GAS Webhook 스크립트 및 트리거 등록 (실시간 동기화용)

1. **스크립트 편집기 열기:** 구글 폼과 연결된 응답 스프레드시트 메뉴에서 `확장 프로그램` -> `Apps Script` 클릭.
2. **코드 작성:** `Code.gs`에 `onSubmit(e)` 함수를 작성하여 `e.namedValues` 데이터를 읽고 Next.js 서버 웹훅 엔드포인트(`https://[도메인]/api/sync/webhook`)로 전송하도록 구현 (지수 백오프 및 에러 기록 로직 포함).
3. **트리거 등록:** 좌측 메뉴의 시계 아이콘(트리거) 클릭 -> 우측 하단 `트리거 추가`.
   - 실행할 함수: `onSubmit`
   - 이벤트 소스: `스프레드시트에서`
   - 이벤트 유형: `양식 제출 시`
   - 저장 클릭 후 구글 계정 권한(고급 -> 안전하지 않음으로 이동) 허용.

---

## 5. UI/UX 및 기능 명세

### 5.1 사용자 화면: 선교 등록 여부 조회 (`/inquiry`)

사용자가 본인의 등록 정보를 확인하는 읽기 전용 페이지입니다.

- **동적 필터링 (Cascading Select):**
  - Step 1. 대분류 드롭다운 (2청, 기타, 청장년) 선택.
  - Step 2. 대분류에 종속된 **세부 부서 1계층** 선택 (예: 진, 소속부서).
  - Step 3. (옵션) **세부 부서 2계층** 선택 (예: 2청은 '팀', 청장년은 '연계교회명').
  - Step 4. (선택적) 이름 입력창 활성화.
- **조회 로직:**
  - 세부 부서까지만 선택 시: 해당 세부 부서의 전체 리스트 노출.
  - 이름 포함 입력 시: 조건에 일치하는 특정 대원만 노출.
- **노출 데이터:** 폼 수집 정보 전체 항목 (소속 목장 포함) + **등록비 납부 여부 (뱃지 형태)** 노출.
- **접근 제어:** 어떠한 경우에도 데이터를 수정할 수 없습니다.

### 5.2 관리자 화면: 등록비 납부 상태 관리 (`/admin`)

대원들의 납부 상태를 통제하고 시스템을 관리하는 격리된 페이지입니다.

- **인증 (Authentication):**
  - `.env`에 보관된 Bcrypt 해싱 처리된 관리자 PIN 코드를 입력하여 진입. (Node 런타임의 `/api/auth` 호출)
  - 실패 시 `/inquiry` 페이지로 리다이렉트 처리. 성공 시 `HttpOnly` 쿠키 발급.
- **납부 상태 변경 기능:**
  - 대원 리스트 우측에 `Toggle Button` 또는 `Checkbox` 배치.
  - 클릭 시 TanStack Query의 낙관적 업데이트(Optimistic Update)를 적용하여 UI를 즉시 변경하고, 백그라운드에서 API 호출을 통해 DB 갱신.
- **관리자 액션:**
  - 우측 상단에 **[수동 동기화(Sync)]** 버튼 배치 (클릭 시 로딩 스피너 및 성공/실패 토스트 알림).

---

## 6. 사전 준비 및 환경 변수 (.env)

개발 및 운영 환경 세팅을 위해 다음의 정보가 사전에 준비되어야 합니다.

```env
# Database (Neon Serverless)
DATABASE_URL="postgres://[USER]:[PASSWORD]@[NEON_HOST]/[DB_NAME]?sslmode=require"

# Admin Authentication
ADMIN_PIN_HASH="$2b$10$..."  # Bcrypt로 해싱된 PIN 번호

# Google Sheets API 연동 (GCP Service Account - 수동 동기화용)
GOOGLE_SHEET_ID_2CHUNG="1BxiMVs0XRYFgwnTE..."
GOOGLE_SHEET_ID_ETC="1BxiMVs0XRYFgwnTE..."
GOOGLE_SHEET_ID_ADULT="1BxiMVs0XRYFgwnTE..."
GOOGLE_CLIENT_EMAIL="mission-sync@my-project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIB...\n-----END PRIVATE KEY-----\n"

# Discord Alert Webhook
DISCORD_WEBHOOK_URL="[https://discord.com/api/webhooks/](https://discord.com/api/webhooks/)..."
```
