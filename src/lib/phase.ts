// Phase 순서 및 아침 식수 소스 매핑
// 흐름: 저녁(P) 체크인 시 breakfast_count("내일 아침 식사 인원")를 입력받으므로,
// 아침(A) phase의 식수는 직전 저녁(P) phase의 breakfast_count가 소스가 된다.
//   예) 2A ← 1P, 3A ← 2P, 4A ← 3P. (1A는 직전 phase가 없음)
export const PHASE_ORDER = [
  '1A',
  '1P',
  '2A',
  '2P',
  '3A',
  '3P',
  '4A',
  '4P',
] as const

export type PhaseOrderCode = (typeof PHASE_ORDER)[number]

// 아침 phase의 식수 소스가 되는 직전 저녁(P) phase를 반환.
// 아침 phase가 아니거나 직전 phase가 없으면(1A) null.
export function breakfastSourcePhase(phase: string): string | null {
  if (!phase.endsWith('A')) return null
  const i = PHASE_ORDER.indexOf(phase as PhaseOrderCode)
  return i > 0 ? PHASE_ORDER[i - 1] : null
}
