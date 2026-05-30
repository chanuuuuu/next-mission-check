# 데이터베이스 스키마 및 설계안 (Database Schema & Design)

선교 등록 데이터를 단일 `mission_registrations` 테이블에 통합 관리합니다.  
부서별 폼 항목 차이는 2계층 세부 부서 컬럼(`sub_department_1`, `sub_department_2`)으로 정규화하여 수용합니다.

---

## 1. 테이블 스펙

### 1.1 `mission_registrations` 테이블

| 컬럼명 | 데이터 타입 | 제약 조건 | 설명 |
|:---|:---|:---|:---|
| `id` | UUID | PK, Default `gen_random_uuid()` | 레코드 고유 식별자 |
| `department_main` | VARCHAR | NOT NULL | 대분류 (2청 / 기타부서 / 청장년) |
| `sub_department_1` | VARCHAR | NOT NULL | 세부 부서 1계층 (진, 소속부서) |
| `sub_department_2` | VARCHAR | NULL | 세부 부서 2계층 (2청: 팀 / 청장년: 연계교회명 / 기타부서: 없음) |
| `small_group` | VARCHAR | NULL | 소그룹 (청장년의 '소속 목장' 전용) |
| `name` | VARCHAR | NOT NULL | 이름 |
| `phone_last_four` | VARCHAR(4) | NOT NULL | 휴대폰 번호 뒤 4자리 |
| `church_name` | VARCHAR | NULL | 연계교회 이름 (2청 전용 — 결과 카드 표시용) |
| `arrival_time` | VARCHAR | NULL | 도착 예상 시간 |
| `use_personal_car` | BOOLEAN | NULL | 자차 이용 여부 |
| `use_return_bus` | BOOLEAN | NULL | 복귀 시 버스 탑승 여부 |
| `payment_status` | BOOLEAN | NOT NULL, Default `FALSE` | **[관리자 전용]** 등록비 납부 여부 |
| `created_at` | TIMESTAMPTZ | Default `NOW()` | 최초 등록 일시 |
| `updated_at` | TIMESTAMPTZ | Default `NOW()` | 최근 수정 일시 |

---

## 2. 복합 유니크 키 제약 조건 세부 설계

### 2.1 UPSERT 대상 키

`sub_department_1`, `sub_department_2`, `name`, `phone_last_four` 4개 컬럼이 복합 유니크 키입니다.

> **⚠️ NULL 처리 주의사항**  
> PostgreSQL 기본 UNIQUE 제약은 NULL을 서로 다른 값으로 취급합니다.  
> 기타부서처럼 `sub_department_2 = NULL`인 행은 동일한 값이 들어와도 제약을 통과하여 중복 INSERT가 허용됩니다.

**해결책: `NULLS NOT DISTINCT` (PostgreSQL 15+ — Neon DB 지원)**

```sql
CONSTRAINT uq_registration UNIQUE NULLS NOT DISTINCT (
  sub_department_1,
  sub_department_2,
  name,
  phone_last_four
)
```

### 2.2 Upsert 정책

- `ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET ...`으로 폼 항목 전체 덮어쓰기
- **단, `payment_status`는 반드시 제외**: 관리자가 수동 체크한 납부 상태가 재제출로 초기화되지 않도록 격리

```sql
ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET
  department_main  = EXCLUDED.department_main,
  small_group      = EXCLUDED.small_group,
  church_name      = EXCLUDED.church_name,
  arrival_time     = EXCLUDED.arrival_time,
  use_personal_car = EXCLUDED.use_personal_car,
  use_return_bus   = EXCLUDED.use_return_bus,
  updated_at       = NOW()
  -- payment_status 의도적 제외
```

---

## 3. DDL 스크립트

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

-- 사용자 조회용: 부서 필터 + 세부 부서 cascading
CREATE INDEX idx_mr_dept ON mission_registrations (department_main, sub_department_1, sub_department_2);

-- 관리자 납부 관리용: 부서 필터 + 납부 상태 분류
CREATE INDEX idx_mr_payment ON mission_registrations (department_main, payment_status);

-- 이름 검색용
CREATE INDEX idx_mr_name ON mission_registrations (name);
```

---

## 4. 부서별 컬럼 활용 매핑

| 부서 | sub_dept_1 값 | sub_dept_2 값 | small_group | church_name |
|:---|:---|:---|:---|:---|
| 2청 | 소속부서(진) | 소속부서(팀) | — | 연계교회 이름 |
| 기타부서 | 소속부서 | **NULL** | — | — |
| 청장년 | 세부소속(진) | 연계교회 이름 | 소속 목장 | — |

- 2청의 `church_name`은 cascading 필터 단계로 노출하지 않고 결과 카드에서만 표시
- 기타부서는 sub_dept_2 없으므로 dropdown Step 3 건너뜀

---

## 5. 핵심 쿼리 예시

### 5.1 Cascading Dropdown 데이터 — sub_department_1 목록

```sql
SELECT DISTINCT sub_department_1
FROM mission_registrations
WHERE department_main = $1
ORDER BY sub_department_1;
```

### 5.2 Cascading Dropdown 데이터 — sub_department_2 목록

NULL이 하나도 없으면 기타부서처럼 Step 3가 필요 없음을 클라이언트가 판단.

```sql
SELECT DISTINCT sub_department_2
FROM mission_registrations
WHERE department_main = $1
  AND sub_department_1 = $2
  AND sub_department_2 IS NOT NULL
ORDER BY sub_department_2;
```

### 5.3 사용자 조회 — 세부 부서 전체 리스트 (이름 미입력)

```sql
SELECT id, name, sub_department_1, sub_department_2, small_group,
       church_name, arrival_time, use_personal_car, use_return_bus, payment_status
FROM mission_registrations
WHERE department_main  = $1
  AND sub_department_1 = $2
  AND (sub_department_2 = $3 OR ($3 IS NULL AND sub_department_2 IS NULL))
ORDER BY name;
```

### 5.4 사용자 조회 — 이름 필터 추가

```sql
-- 위 WHERE절에 아래 조건 추가
  AND name = $4
```

### 5.5 관리자 — 부서 필터 + 이름 검색

```sql
SELECT * FROM mission_registrations
WHERE department_main = $1
  AND ($2::text IS NULL OR name ILIKE '%' || $2 || '%')
ORDER BY sub_department_1, sub_department_2, name;
```

### 5.6 관리자 — 납부 상태 토글

```sql
UPDATE mission_registrations
SET payment_status = NOT payment_status,
    updated_at     = NOW()
WHERE id = $1
RETURNING id, payment_status;
```

### 5.7 관리자 — 수동 대원 추가 (단건)

```sql
INSERT INTO mission_registrations
  (department_main, sub_department_1, sub_department_2, small_group,
   name, phone_last_four, church_name, arrival_time, use_personal_car, use_return_bus)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET
  department_main  = EXCLUDED.department_main,
  church_name      = EXCLUDED.church_name,
  arrival_time     = EXCLUDED.arrival_time,
  use_personal_car = EXCLUDED.use_personal_car,
  use_return_bus   = EXCLUDED.use_return_bus,
  updated_at       = NOW();
```
