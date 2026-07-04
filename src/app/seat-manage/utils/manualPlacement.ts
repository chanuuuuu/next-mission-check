import { FLOORS } from '../config/seatLayout'
import { isSeatDisabled, getBaseScore } from '../config/seatScores'

export interface ManualPlacementResult {
  feasible: boolean
  seatKeys: string[]
  earnedScore: number
}

// Attempts to place `headcount` people starting from `startRowIdx` (0-indexed physical row)
// within a single block. All seats in each row used are included in seatKeys (consistent
// with auto-placement behavior). Returns feasible=false if the block runs out of rows.
export function tryPlaceAtRow(
  sectionId: string,
  floorId: '1F' | '2F',
  startRowIdx: number,
  headcount: number,
  overrides: Record<string, number> = {},
): ManualPlacementResult {
  const floor = FLOORS.find(f => f.id === floorId)
  if (!floor) return { feasible: false, seatKeys: [], earnedScore: 0 }

  const section = floor.sections.find(s => s.id === sectionId)
  if (!section) return { feasible: false, seatKeys: [], earnedScore: 0 }

  const block = sectionId.split('-')[1]

  const activeRows = section.rows.filter(
    (_, r) => !isSeatDisabled(`${floorId}_${block}_R${r + 1}_C1`),
  ).length

  const seatKeys: string[] = []
  const usedRows: { rawRowIdx: number; capacity: number }[] = []
  let totalCapacity = 0

  for (let r = startRowIdx; r < section.rows.length; r++) {
    if (isSeatDisabled(`${floorId}_${block}_R${r + 1}_C1`)) continue

    const rowCapacity = section.rows[r].count
    const rowKeys: string[] = []
    for (let c = 0; c < rowCapacity; c++) {
      const key = `${floorId}_${block}_R${r + 1}_C${c + 1}`
      if (!isSeatDisabled(key)) rowKeys.push(key)
    }
    seatKeys.push(...rowKeys)
    usedRows.push({ rawRowIdx: r, capacity: rowKeys.length })
    totalCapacity += rowKeys.length

    if (totalCapacity >= headcount) {
      let baseTotal = 0
      let cap = 0
      for (const { rawRowIdx, capacity } of usedRows) {
        const score = getBaseScore(floorId, rawRowIdx, activeRows)
        baseTotal += score * capacity
        cap += capacity
      }
      const baseAvg = cap > 0 ? baseTotal / cap : 0
      const overrideTotal = seatKeys.reduce((s, k) => s + (overrides[k] ?? 0), 0)
      const earnedScore = baseAvg + (seatKeys.length > 0 ? overrideTotal / seatKeys.length : 0)
      return { feasible: true, seatKeys, earnedScore }
    }
  }

  return { feasible: false, seatKeys: [], earnedScore: 0 }
}
