const GOLDEN_ANGLE = 137.508

export const TEAM_COLORS: readonly string[] = Array.from({ length: 52 }, (_, i) => {
  const hue = (i * GOLDEN_ANGLE) % 360
  const lightness = i % 2 === 0 ? 0.78 : 0.67
  return `oklch(${lightness} 0.17 ${hue.toFixed(1)})`
})

// 인덱스 역조회: 색상 문자열 → 팔레트 인덱스 (O(1))
const COLOR_TO_IDX = new Map(TEAM_COLORS.map((c, i) => [c, i]))

function colorHue(idx: number): number {
  return (idx * GOLDEN_ANGLE) % 360
}

function colorLightness(idx: number): boolean {
  return idx % 2 === 0 // true = light tier
}

function hueDist(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

// 두 팔레트 인덱스가 시각적으로 유사한지 판별 (같은 밝기 계층 + 색조 40° 이내)
function areSimilar(idxA: number, idxB: number): boolean {
  return colorLightness(idxA) === colorLightness(idxB) && hueDist(colorHue(idxA), colorHue(idxB)) < 40
}

const OFFSETS: [number, number][] = [[0, 1], [0, -1], [1, 0], [-1, 0]]

/**
 * 배치 결과 기반 색상 할당
 * - 각 팀의 "자연 인덱스" (teamId → 골든앵글 팔레트 위치)에서 시작
 * - 인접 팀과 동일하거나 시각적으로 유사한 색상이면 다음 인덱스로 밀어냄
 * - 52색 팔레트를 최대한 활용하므로 기존의 다양성이 유지됨
 */
export function computeTeamColors(assignments: Record<string, number>): Map<number, string> {
  const adjacency = new Map<number, Set<number>>()

  for (const [key, teamId] of Object.entries(assignments)) {
    if (!adjacency.has(teamId)) adjacency.set(teamId, new Set())

    const parts = key.split('_')
    const floor = parts[0]
    const block = parts[1]
    const row = parseInt(parts[2].slice(1))
    const col = parseInt(parts[3].slice(1))

    for (const [dr, dc] of OFFSETS) {
      const neighborKey = `${floor}_${block}_R${row + dr}_C${col + dc}`
      const neighborTeam = assignments[neighborKey]
      if (neighborTeam && neighborTeam !== teamId) {
        adjacency.get(teamId)!.add(neighborTeam)
        if (!adjacency.has(neighborTeam)) adjacency.set(neighborTeam, new Set())
        adjacency.get(neighborTeam)!.add(teamId)
      }
    }
  }

  // 제약이 많은 팀부터 처리
  const sorted = [...adjacency.keys()].sort(
    (a, b) => (adjacency.get(b)?.size ?? 0) - (adjacency.get(a)?.size ?? 0),
  )

  const colorMap = new Map<number, string>()

  for (const teamId of sorted) {
    const neighborIndices: number[] = []
    for (const neighborId of adjacency.get(teamId)!) {
      const c = colorMap.get(neighborId)
      if (c !== undefined) {
        const idx = COLOR_TO_IDX.get(c)
        if (idx !== undefined) neighborIndices.push(idx)
      }
    }

    const naturalIdx = (teamId - 1) % TEAM_COLORS.length

    // 1차: 동일 색상도, 유사 색상도 없는 인덱스 탐색
    let picked = -1
    for (let attempt = 0; attempt < TEAM_COLORS.length; attempt++) {
      const idx = (naturalIdx + attempt) % TEAM_COLORS.length
      const hasHard = neighborIndices.includes(idx)
      const hasSoft = neighborIndices.some(n => areSimilar(idx, n))
      if (!hasHard && !hasSoft) { picked = idx; break }
    }

    // 2차 폴백: 동일 색상만 피함
    if (picked === -1) {
      for (let attempt = 0; attempt < TEAM_COLORS.length; attempt++) {
        const idx = (naturalIdx + attempt) % TEAM_COLORS.length
        if (!neighborIndices.includes(idx)) { picked = idx; break }
      }
    }

    colorMap.set(teamId, TEAM_COLORS[picked >= 0 ? picked : naturalIdx])
  }

  return colorMap
}
