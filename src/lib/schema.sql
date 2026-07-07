-- ============================================================
-- 체크인 시스템 DDL
-- Neon DB 콘솔 SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- 1. 교회 마스터
CREATE TABLE IF NOT EXISTS churches (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    address    TEXT,
    team_name  VARCHAR(50),
    team_type  VARCHAR(20),
    jin_name   VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. 체크인 기록
CREATE TABLE IF NOT EXISTS checkins (
    id               SERIAL PRIMARY KEY,
    church_id        INTEGER NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    phase_code       VARCHAR(10) NOT NULL,
    is_all_arrived   BOOLEAN NOT NULL DEFAULT FALSE,
    total_count      INTEGER NOT NULL DEFAULT 0,  -- 저녁 식사 인원 수
    breakfast_count  INTEGER NOT NULL DEFAULT 0,  -- 내일 아침 식사 인원 수
    report_notes     TEXT,
    meal_called      BOOLEAN NOT NULL DEFAULT FALSE,  -- 식사 호출 완료 여부
    dynamic_questions JSONB,
    checked_in_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- 교회 1개 + Phase 1개 → 체크인 레코드 1개만 허용
    CONSTRAINT unique_church_phase UNIQUE (church_id, phase_code)
);

-- 3. 스캐너 세션
--    church_id가 PK — sessionId 없는 결정적 QR 설계 반영
CREATE TABLE IF NOT EXISTS scanner_sessions (
    church_id  INTEGER PRIMARY KEY REFERENCES churches(id) ON DELETE CASCADE,
    status     VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING | SCANNED | COMPLETED
    scanned_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. 시스템 전역 설정 (active_phase 관리)
CREATE TABLE IF NOT EXISTS app_settings (
    key        VARCHAR(50) PRIMARY KEY,
    value      VARCHAR(100) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 초기 활성 Phase 삽입
INSERT INTO app_settings (key, value)
VALUES ('active_phase', '1A')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 인덱스
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_checkins_phase_church
    ON checkins (phase_code, church_id);

CREATE INDEX IF NOT EXISTS idx_checkins_checked_at
    ON checkins (phase_code, checked_in_at ASC);

-- ============================================================
-- 저녁/아침 식사 인원 분리 + 식사 호출 완료 상태
-- 기존 DB에 적용: 아래 ALTER TABLE 실행
-- 신규 설치 시에는 checkins CREATE TABLE에 이미 포함됨
-- ============================================================
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS breakfast_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE checkins ADD COLUMN IF NOT EXISTS meal_called BOOLEAN NOT NULL DEFAULT FALSE;

-- ============================================================
-- 좌석 자동 배치 시스템 DDL
-- churches 테이블에 team_name, team_type 이미 존재 — ALTER 불필요
-- ============================================================

-- 팀 마스터 (교회 1개당 팀 1개)
CREATE TABLE IF NOT EXISTS teams (
    id                SERIAL  PRIMARY KEY,
    church_id         INT     NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    headcount         INT     NOT NULL DEFAULT 13,
    color_code        VARCHAR(30) NOT NULL,
    accumulated_score FLOAT   NOT NULL DEFAULT 0.0,
    created_at        TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 배치 회차 관리
CREATE TABLE IF NOT EXISTS phases (
    id              SERIAL PRIMARY KEY,
    phase_number    INT    NOT NULL UNIQUE,
    description     VARCHAR(255),
    assignment_mode VARCHAR(10) NOT NULL DEFAULT 'team', -- 'team' | 'jin'
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 좌석 배치 결과
CREATE TABLE IF NOT EXISTS seat_assignments (
    id             SERIAL PRIMARY KEY,
    phase_id       INT        NOT NULL REFERENCES phases(id)  ON DELETE CASCADE,
    team_id        INT        REFERENCES teams(id) ON DELETE CASCADE, -- NULL for jin mode
    jin_name       VARCHAR(20),                 -- set when assignment_mode = 'jin'
    floor          INT        NOT NULL,          -- 1 또는 2
    block          VARCHAR(2) NOT NULL,          -- 'A' | 'B' | 'C' | 'D'
    assigned_seats JSONB      NOT NULL,          -- ["1F_A_R1_C1", ...]
    earned_score   FLOAT      NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_seat_unit CHECK (team_id IS NOT NULL OR jin_name IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_seat_assignments_phase_team ON seat_assignments (phase_id, team_id);
CREATE INDEX IF NOT EXISTS idx_teams_church                ON teams (church_id);

-- ============================================================
-- 요일별 headcount (목/금/토/일 4회 배치 세션 지원)
-- 기존 DB에 적용: 아래 ALTER TABLE 실행
-- 신규 설치 시에는 teams CREATE TABLE에 이미 포함됨
-- ============================================================
ALTER TABLE teams ADD COLUMN IF NOT EXISTS headcount_thu INT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS headcount_fri INT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS headcount_sat INT DEFAULT NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS headcount_sun INT DEFAULT NULL;

-- ============================================================
-- 숙소 배정 (docs/숙소배정_통합.json 적재용)
-- group/team/church명은 church_id별로 고정값이므로 churches JOIN으로 조회
-- (별도 저장하지 않음 — 중복 데이터 방지)
-- ============================================================
CREATE TABLE IF NOT EXISTS accommodations (
    id         SERIAL PRIMARY KEY,
    church_id  INT         NOT NULL REFERENCES churches(id) ON DELETE CASCADE,
    building   VARCHAR(20) NOT NULL,  -- '[신관]' | '[1관]' | '[AJ]'
    room       INT         NOT NULL,
    name       VARCHAR(50) NOT NULL, -- 인원명, '타팀 1명' 등 placeholder 포함(동일 방 내 중복 가능)
    number     INT,                  -- 인원 고유번호(0198 등, 0-padding 없이 저장), '타팀 1명' 등 placeholder는 NULL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS number INT;

-- scope: church.team_type 파생값 (0 = YOUTH, 1 = ADULT)
ALTER TABLE accommodations ADD COLUMN IF NOT EXISTS scope SMALLINT;

CREATE INDEX IF NOT EXISTS idx_accommodations_church        ON accommodations (church_id);
CREATE INDEX IF NOT EXISTS idx_accommodations_church_room    ON accommodations (church_id, building, room);

-- number 컬럼 부분 유니크 인덱스 (전역 유일, placeholder 행의 NULL은 제외)
CREATE UNIQUE INDEX IF NOT EXISTS idx_accommodations_number
    ON accommodations (number) WHERE number IS NOT NULL;
