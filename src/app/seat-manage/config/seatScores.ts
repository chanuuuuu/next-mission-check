// 1F-D rows 0 and 1 (R1, R2) are POP/disabled seats — 24 seats total
export const DISABLED_SEATS = new Set<string>([
  ...Array.from({ length: 12 }, (_, c) => `1F_D_R1_C${c + 1}`),
  ...Array.from({ length: 12 }, (_, c) => `1F_D_R2_C${c + 1}`),
])

export function isSeatDisabled(seatKey: string): boolean {
  return DISABLED_SEATS.has(seatKey)
}

// 1F: all sections share the same front-row score, decrement by 1 going back.
//   Reference: C section has 19 active rows. Back row (row 19) = 13, front (row 1) = 31.
//   All other sections' front rows also score 31:
//     A  (8 rows): front=31, back=24
//     B (18 rows): front=31, back=14
//     C (19 rows): front=31, back=13
//     D (14 rows): front=31, back=18
//
// 2F: back=1, front=activeRows. All 2F sections have 12 rows → front=12.
//
// Invariant: 1F min (C back=13) > 2F max (front=12) ✓
const C_ACTIVE_ROWS = 19
const MAX_1F_SCORE = C_ACTIVE_ROWS + 12  // 31

// physicalRowIdx: 0-indexed position in the section's full row array (including disabled rows).
// For 1F-D, rows 0-1 are disabled, so the first active row has physicalRowIdx=2 → score=29.
// For sections without disabled front rows, physicalRowIdx === activeRowIdx.
export function getBaseScore(
  floorId: '1F' | '2F',
  physicalRowIdx: number,
  activeRows: number,
): number {
  if (floorId === '2F') {
    return activeRows - physicalRowIdx  // back=1, front=activeRows (=12 for all 2F sections)
  }
  return MAX_1F_SCORE - physicalRowIdx  // front=31, decrement by 1 going back
}

// Per-seat score adjustments. Keys use "1F_C_R3_C6" format. Values are additive deltas.
// Edit this object directly in code, or use the admin UI's "점수 보정 설정" panel.
export const SCORE_OVERRIDES: Record<string, number> = {}
