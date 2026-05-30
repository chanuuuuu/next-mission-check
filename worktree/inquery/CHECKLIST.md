# 선교 등록 관리 시스템 — 배포 체크리스트

> **코드 구현은 완료 상태입니다.** 이 파일에 있는 항목만 순서대로 진행하면 됩니다.

---

## STEP 1 — Neon DB 테이블 생성

**Neon 콘솔 → SQL Editor**에서 아래 DDL을 실행합니다.

```sql
CREATE TABLE mission_registrations (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  department_main  VARCHAR     NOT NULL,
  sub_department_1 VARCHAR     NOT NULL,
  sub_department_2 VARCHAR     NULL,
  small_group      VARCHAR     NULL,
  name             VARCHAR     NOT NULL,
  phone_last_four  VARCHAR(4)  NOT NULL,
  church_name      VARCHAR     NULL,
  arrival_time     VARCHAR     NULL,
  use_personal_car BOOLEAN     NULL,
  use_return_bus   BOOLEAN     NULL,
  payment_status   BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_registration UNIQUE NULLS NOT DISTINCT (
    sub_department_1,
    sub_department_2,
    name,
    phone_last_four
  )
);

CREATE INDEX idx_mr_dept    ON mission_registrations (department_main, sub_department_1, sub_department_2);
CREATE INDEX idx_mr_payment ON mission_registrations (department_main, payment_status);
CREATE INDEX idx_mr_name    ON mission_registrations (name);
```

- [ ] DDL 실행 완료

---

## STEP 2 — 환경변수 설정 (`.env.local`)

### 2-1. 관리자 PIN 해시 생성

터미널에서 아래 명령어를 실행해 해시값을 얻습니다.

```bash
node -e "const b=require('bcryptjs'); console.log(b.hashSync('원하는PIN번호', 10))"
```

### 2-2. `.env.local`에 추가

```env
# 관리자 인증
ADMIN_PIN_HASH="위에서 생성한 $2b$10$... 해시값"

# Google Sheets API (GCP 서비스 계정)
GOOGLE_SHEET_ID_2CHUNG="스프레드시트 URL에서 /d/ 뒤의 ID"
GOOGLE_SHEET_ID_ETC="기타부서 시트 ID"
GOOGLE_SHEET_ID_ADULT="청장년 시트 ID"
GOOGLE_CLIENT_EMAIL="서비스계정@프로젝트명.iam.gserviceaccount.com"
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **GOOGLE_PRIVATE_KEY 주의:** JSON 키 파일의 `private_key` 값을 그대로 붙여넣되,
> 줄바꿈을 `\n`으로 유지합니다 (큰따옴표로 감싸야 함).

- [ ] `.env.local` 작성 완료
- [ ] `npm run dev`로 로컬 실행 확인

---

## STEP 3 — Google Cloud 서비스 계정 설정

GCP 서비스 계정이 아직 없다면 아래 순서로 생성합니다.

1. [Google Cloud Console](https://console.cloud.google.com) → 새 프로젝트 생성
2. **API 및 서비스 → 라이브러리** → `Google Sheets API` 검색 후 **활성화**
3. **사용자 인증 정보 → 사용자 인증 정보 만들기 → 서비스 계정** 생성
4. 생성된 서비스 계정 클릭 → **키 탭 → 새 키 만들기 (JSON)** 다운로드
5. JSON 파일에서 `client_email`과 `private_key`를 복사해 `.env.local`에 입력

**각 부서 스프레드시트에 서비스 계정 공유:**
- 2청 / 기타부서 / 청장년 폼 응답 스프레드시트를 각각 열고
- 우측 상단 **공유** 버튼 → `client_email` 주소를 **편집자**로 추가

- [ ] 서비스 계정 생성 및 키 발급
- [ ] 3개 스프레드시트에 서비스 계정 공유 완료

---

## STEP 4 — 각 구글 시트에 `동기화 상태` 컬럼 추가

3개 부서 폼 응답 스프레드시트 각각에서:

1. 헤더 행(1행)의 **맨 우측 빈 셀**에 `동기화 상태` 입력
2. 저장

> 수동 동기화 성공 시 이 컬럼에 `SUCCESS`가 기록됩니다. 컬럼이 없으면 기록이 누락됩니다.

- [ ] 2청 시트에 `동기화 상태` 컬럼 추가
- [ ] 기타부서 시트에 `동기화 상태` 컬럼 추가
- [ ] 청장년 시트에 `동기화 상태` 컬럼 추가

---

## STEP 5 — Vercel 배포

```bash
# Vercel CLI가 없다면 설치
npm i -g vercel

# 배포
vercel --prod
```

또는 GitHub에 push 후 Vercel 대시보드에서 자동 배포.

**Vercel 환경변수 등록:** 대시보드 → 프로젝트 → Settings → Environment Variables에
`.env.local`의 값들을 동일하게 입력합니다.

- [ ] Vercel 환경변수 등록 완료
- [ ] 배포 완료 및 URL 확인

---

## STEP 6 — GAS 웹훅 스크립트 등록 (부서별 3회 반복)

> 각 부서의 구글 폼 응답 스프레드시트마다 아래 작업을 반복합니다.

### 6-1. Apps Script 열기

스프레드시트 메뉴 → **확장 프로그램 → Apps Script**

### 6-2. 코드 작성

`worktree/inquery/gas_webhook_template.gs` 파일의 내용을 `Code.gs`에 붙여넣고:

```javascript
// 이 두 줄만 부서에 맞게 수정
const WEBHOOK_URL = 'https://[배포된Vercel도메인]/api/inquery/sync/webhook'
const DEPARTMENT = '2청'  // '2청' | '기타부서' | '청장년' 중 선택
```

### 6-3. Script Properties에 Discord URL 저장

Apps Script 편집기 → 좌측 **⚙ 프로젝트 설정** → **스크립트 속성** → **속성 추가**

| 속성 이름 | 값 |
|---|---|
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL |

### 6-4. 트리거 등록

Apps Script 좌측 **시계 아이콘(트리거) → 우측 하단 트리거 추가**

| 항목 | 설정값 |
|---|---|
| 실행할 함수 | `onFormSubmit` |
| 이벤트 소스 | **스프레드시트에서** ← 반드시 이것 선택 |
| 이벤트 유형 | **양식 제출 시** |

> ⚠️ `Google Forms에서`가 아닌 **`스프레드시트에서`** 를 선택해야 합니다.
> Forms 트리거는 `e.namedValues`를 제공하지 않아 동기화가 작동하지 않습니다.

저장 후 Google 계정 권한 허용.

- [ ] 2청 GAS 스크립트 등록 + 트리거 연결
- [ ] 기타부서 GAS 스크립트 등록 + 트리거 연결
- [ ] 청장년 GAS 스크립트 등록 + 트리거 연결

---

## STEP 7 — E2E 검증

### 7-1. 웹훅 테스트 (curl)

```bash
curl -X POST https://[배포도메인]/api/inquery/sync/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "department": "기타부서",
    "namedValues": {
      "소속부서": ["찬양팀"],
      "이름": ["홍길동"],
      "핸드폰 번호": ["1234"],
      "도착 예상시간": ["09:00"],
      "자차를 가져 오시나요": ["예"],
      "교회 버스에 탑승하시나요": ["아니요"]
    }
  }'
# 응답: {"ok":true}
```

- [ ] 웹훅 응답 `{"ok":true}` 확인
- [ ] Neon 콘솔에서 `mission_registrations` 행 삽입 확인
- [ ] 동일 키로 재전송 → 행이 1건만 유지되는지 확인 (Upsert)
- [ ] `payment_status`가 초기화되지 않는지 확인

### 7-2. 수동 동기화 테스트

- [ ] `/inquiry/admin` 로그인 후 **누락 데이터 강제 동기화** 클릭
- [ ] 응답 토스트 `동기화 완료 · N건 보정` 확인
- [ ] 구글 시트의 `동기화 상태` 컬럼에 `SUCCESS` 기록 확인

### 7-3. GAS 실시간 동기화 테스트

- [ ] 폼 제출 → Neon DB에 즉시 반영 확인
- [ ] 실패 시 Discord 채널 알림 수신 확인

### 7-4. 관리자 기능 검증

- [ ] `/inquiry/admin/login` → 잘못된 PIN → 오류 메시지 확인
- [ ] 올바른 PIN → `/inquiry/admin` 진입 확인
- [ ] 납부 토글 클릭 → 즉각 UI 반전 → DB 반영 확인
- [ ] 브라우저 쿠키 삭제 후 `/inquiry/admin` 직접 접근 → login 리다이렉트 확인

### 7-5. 사용자 조회 검증

- [ ] `/inquiry` → 부서 선택 → 조회 버튼 → 결과 노출 확인
- [ ] 이름 검색 → 동명이인 복수 노출 확인
- [ ] 결과 수정 불가 확인 (읽기 전용)
