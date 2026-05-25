-- ============================================================
-- 체크인 시스템 DDL
-- Neon DB 콘솔 SQL Editor에서 순서대로 실행하세요.
-- ============================================================

-- 1. 교회 마스터
CREATE TABLE IF NOT EXISTS churches (
    id         SERIAL PRIMARY KEY,
    name       VARCHAR(100) NOT NULL,
    address    TEXT,
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
