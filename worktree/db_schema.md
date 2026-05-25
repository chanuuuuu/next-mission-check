# 데이터베이스 스키마 및 설계안 (Database Schema & Design)

본 시스템은 서버리스 PostgreSQL인 **Neon DB**를 기반으로 하며, 총 8번의 Phase 동안 데이터의 정합성을 보장하고 중복 제출을 차단할 수 있도록 유니크 인덱스 및 관계형 제약 조건을 꼼꼼하게 설계했습니다.

## 1. 개체-관계 다이어그램 개념 구조 (ERD 구조 요약)

- `churches` (교회 마스터 데이터) -> 1:N -> `checkins` (체크인 내역 데이터)
- `checkins` 테이블은 어떤 교회가, 어떤 Phase에, 어떤 데이터로 도착했는지를 기록하는 핵심 엔티티입니다.

---

## 2. 테이블 스펙 (Table Specifications)

### 2.1 `churches` 테이블 (교회 마스터 정보)

행사에 참석하는 모든 교회의 기본 정보를 담고 있는 마스터 테이블입니다. 관리자 페이지를 통해 수동으로 레코드가 추가될 수 있습니다.

```sql
CREATE TABLE churches (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2 checkins 테이블 (실제 도착 및 체크인 기록)

대원들이 폼을 통해 제출한 실제 데이터가 적재되는 테이블입니다. 중복 제출을 방지하는 것이 가장 중요합니다.

```sql
CREATE TABLE checkins (
    id SERIAL PRIMARY KEY,
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    phase_code VARCHAR(10) NOT NULL, -- 예: '1A' (1일차 아침), '1P' (1일차 저녁) ... '4P' (4일차 저녁)
    is_all_arrived BOOLEAN NOT NULL DEFAULT FALSE,
    total_count INTEGER NOT NULL DEFAULT 0,
    report_notes TEXT,
    dynamic_questions JSONB, -- 추후 질문 추가 및 확장성을 위한 JSONB 필드
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- [핵심 제약 조건] 특정 교회는 하나의 Phase 안에서 단 하나의 체크인 레코드만 가질 수 있음
    CONSTRAINT unique_church_phase UNIQUE (church_id, phase_code)
);
```

### 2.3 scanner_sessions 테이블 (노트북-모바일 연동용 임시 세션 테이블)

노트북 웹캠이 QR을 찍었을 때 해당 모바일 기기를 식별하여 Form 페이지로 넘겨주기 위한 매핑 상태 테이블입니다. (인메모리 혹은 가벼운 테이블로 활용)

```sql
CREATE TABLE scanner_sessions (
    session_id VARCHAR(64) PRIMARY KEY, -- 모바일 브라우저가 생성한 고유 UUID/세션값
    church_id INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, SCANNED, COMPLETED
    scanned_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 3. 세부 설계 및 비즈니스 로직 제약 조건

### 3.1 8대 Phase 코드 네이밍 규칙 (phase_code)

행사가 4일간 아침/저녁으로 이루어지므로 다음과 같이 정형화된 8개의 문자열 코드를 도메인 값으로 활용합니다.

- 1일차: 아침 = 1A / 저녁 = 1P
- 2일차: 아침 = 2A / 저녁 = 2P
- 3일차: 아침 = 3A / 저녁 = 3P
- 4일차: 아침 = 4A / 저녁 = 4P

### 3.2 중복 체크인 원천 차단 (Concurrency & Integrity)

대원이 Form 페이지에 진입하거나 제출을 누를 때, 데이터베이스 레벨에서 unique_church_phase 제약 조건이 걸려 있으므로 애플리케이션 에러 이전에 DB 단에서 중복 데이터 INSERT를 차단합니다. Next.js 백엔드 로직에서는 이 예외를 Catch 하여 사용자에게 "이미 체크인 되었습니다"라는 부드러운 UI 팝업으로 치환해 줍니다.

### 3.3 성능 최적화를 위한 인덱스(Index) 설계

체크인 현황판 대시보드는 10초~실시간 단위로 조회가 일어나며, "도착하지 않은 교회"와 "도착한 교회"를 빠르게 분류해야 합니다. 이를 위해 복합 인덱스를 구성합니다.

```sql
-- 특정 Phase 내에서 정렬 및 조회 최적화
CREATE INDEX idx_checkins_phase_church ON checkins (phase_code, church_id);

-- 완료된 순서대로 리스트업하기 위해 시간순 인덱스 생성
CREATE INDEX idx_checkins_checked_at ON checkins (phase_code, checked_in_at ASC);
```

---

## 4. 주요 핵심 SQL 쿼리 예시

### 4.1 특정 Phase의 [도착 완료] 교회 리스트업 (대시보드 우측 영역)

도착 완료된 순서대로 교회의 이름과 인원수를 뽑아오는 가볍고 빠른 쿼리입니다.

```SQL
SELECT
    c.name AS church_name,
    ch.total_count,
    ch.is_all_arrived,
    ch.checked_in_at
FROM checkins ch
JOIN churches c ON ch.church_id = c.id
WHERE ch.phase_code = '1A' -- 현재 활성화된 Phase 코드 예시
ORDER BY ch.checked_in_at ASC;
```

### 4.2 특정 Phase의 [미도착] 교회 리스트업 (대시보드 좌측 영역)

전체 교회 마스터 중에서 해당 Phase에 체크인 레코드가 존재하지 않는 교회를 LEFT JOIN 차집합으로 구합니다.

```sql
SELECT
    c.id,
    c.name AS church_name
FROM churches c
LEFT JOIN checkins ch ON c.id = ch.church_id AND ch.phase_code = '1A'
WHERE ch.id IS NULL
ORDER BY c.name ASC; -- 가나다순 정렬
```
