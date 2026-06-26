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
    total_count      INTEGER NOT NULL DEFAULT 0,
    report_notes     TEXT,
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
