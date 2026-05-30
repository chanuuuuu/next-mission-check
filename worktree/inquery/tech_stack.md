# 기술 스택 정의서 (Tech Stack Specification)

기존 체크인 시스템(Next.js 16 프로젝트)에 `/inquiry`, `/inquiry/admin` 라우트를 추가하는 방식으로 통합합니다.  
인프라와 공통 유틸리티를 재사용하고, 이 시스템에서 추가되는 스택만 별도 정의합니다.

---

## 1. 프레임워크 및 인프라

- **프레임워크**: Next.js 16 (App Router) — 기존 프로젝트에 통합
- **배포**: Vercel (기존 동일)
- **데이터베이스**: Neon DB — 기존 `neon()` HTTP 드라이버 패턴 유지

> **PRD vs 실제 스택 차이**  
> PRD에서 Drizzle ORM을 명시했으나, 기존 코드베이스가 raw `neon()` 쿼리를 사용하므로 일관성을 위해 동일한 패턴을 따릅니다.  
> 타입 안전성은 명시적 cast(`as MissionRegistration[]`)로 확보합니다.

---

## 2. 하이브리드 런타임 구성 전략

### ✅ Node.js Serverless Runtime (기본값)

| 라우트 | 이유 |
|:---|:---|
| `app/api/inquery/sync/webhook/route.ts` | 웹훅 수신 및 DB Upsert — 안정적인 Node 런타임 기본값 |
| `app/api/inquery/sync/manual/route.ts` | `googleapis` 라이브러리 필수 (Node.js 전용 모듈) |
| `app/api/inquery/auth/route.ts` | `bcrypt` (Node.js 전용 crypto 의존) |
| `app/api/inquery/registrations/route.ts` | 일반 DB 쿼리 — Node 런타임 기본값 |
| `app/api/inquery/registrations/[id]/payment/route.ts` | 납부 상태 토글 — Node 런타임 기본값 |

### ⚡ Edge Runtime (V8)

이 시스템에서는 SSE가 필요 없습니다. 체크인 시스템과 달리 실시간 스트리밍 없이 TanStack Query의 낙관적 업데이트로 충분합니다.

| 적용 | 이유 |
|:---|:---|
| 일반 SSR 페이지 (`/inquiry`, `/inquiry/admin`) | 가벼운 Edge 렌더링으로 LCP 최적화 |

---

## 3. 프론트엔드 아키텍처

- **Data Fetching**: TanStack Query v5 (기존 설치됨)
  - `/inquiry`: 필터 선택마다 `useQuery`로 서버 조회 → 동일 부서 재선택 시 캐시 히트로 즉각 응답
  - `/inquiry/admin`: `useMutation` + 낙관적 업데이트로 납부 토글 시 즉각 UI 반영, 실패 시 롤백
- **UI/Styling**: Tailwind CSS v4 (기존 `globals.css` 토큰 공유)
- **상태 관리**: React `useState`만으로 충분 — cascading select 단계 상태, 검색어 등 로컬 UI 상태만 존재

---

## 4. 인증 (Admin)

- **방식**: bcrypt 해싱된 PIN → `HttpOnly` 쿠키 발급
- **런타임 제약**: `bcrypt`는 Node.js 전용이므로 `app/api/inquery/auth/route.ts`에 `export const runtime` 미선언 (Node.js 기본값 유지)
- **보호 범위**: `/inquiry/admin` 접근 시 미들웨어(`middleware.ts` 또는 서버 컴포넌트)에서 쿠키 검증. 실패 시 `/inquiry`로 리다이렉트
- **환경변수**: `ADMIN_PIN_HASH` — 기존 체크인 시스템 어드민과 동일 변수 공유 가능

---

## 5. 구글 시트 연동 (Manual Sync)

- **라이브러리 추가 필요**: `googleapis` (Node.js 전용 — Edge Runtime 사용 불가)
- **인증**: GCP Service Account JSON 키 (환경변수로 주입)
- **동작 흐름**:
  1. `googleapis`로 부서별 시트 전체 rows 조회
  2. `FORM_MAPPINGS` 객체로 컬럼 헤더 → DB 컬럼 매핑
  3. Neon DB에 Upsert (payment_status 제외)
  4. 처리 완료 행의 `[동기화 상태]` 컬럼을 `SUCCESS`로 시트에 Write back

---

## 6. 실시간 웹훅 (GAS → Next.js)

- **GAS 스크립트 담당**: `onSubmit(e)` 트리거 → `e.namedValues` 파싱 → POST `/api/inquery/sync/webhook`
- **Next.js 담당**: 페이로드 수신 → `FORM_MAPPINGS`로 변환 → Upsert
- **재시도 전략**: GAS 측에서 최대 3회 지수 백오프. 3회 실패 시 시트의 `[동기화 상태]` = `FAIL` + Discord Webhook 알림
- **Discord 재사용**: 기존 `src/lib/discord.ts` 그대로 사용

---

## 7. 추가 환경변수

기존 `.env.local`에 추가되는 항목:

```env
# Admin Auth (기존 체크인 admin과 공유 가능)
ADMIN_PIN_HASH="$2b$10$..."

# Google Sheets API (GCP Service Account)
GOOGLE_SHEET_ID_2CHUNG="1BxiMVs0XRY..."
GOOGLE_SHEET_ID_ETC="1BxiMVs0XRY..."
GOOGLE_SHEET_ID_ADULT="1BxiMVs0XRY..."
GOOGLE_CLIENT_EMAIL="mission-sync@project.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

---

## 8. 신규 추가 패키지

| 패키지 | 용도 | 런타임 |
|:---|:---|:---|
| `googleapis` | Google Sheets API (수동 동기화) | Node.js 전용 |
| `bcryptjs` | 관리자 PIN 해싱 검증 | Node.js 전용 |

> `bcryptjs`는 순수 JS 구현이라 `bcrypt`(C++ 바인딩) 대비 호환성이 높습니다. Vercel Serverless 환경에서는 `bcryptjs` 사용을 권장합니다.
