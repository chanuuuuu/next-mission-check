import { FLOORS } from '../config/seatLayout'
import { isSeatDisabled, getBaseScore, SCORE_OVERRIDES } from '../config/seatScores'
import type { Team, AlgoResult } from '@/types/seating'

// Row-level metadata. One RowInfo = one physical row in a section.
interface RowInfo {
  floorId: '1F' | '2F'
  block: string
  rawRowIdx: number        // 0-based index into section.rows[] — used for seat key generation
  capacity: number         // number of seats in this row
  sectionActiveRows: number
  globalActiveIdx: number  // position among active rows in this section (0 = frontmost)
  rowKey: string           // `${floorId}_${block}_r${rawRowIdx}` — unique row identifier
}

// Builds { front, back } RowInfo arrays for each section in a floor.
// front/back split: same backStart = floor(activeCount / 2) formula as before.
function buildSectionRowInfos(
  floorId: '1F' | '2F',
): Map<string, { front: RowInfo[]; back: RowInfo[] }> {
  const floor = FLOORS.find(f => f.id === floorId)!
  const result = new Map<string, { front: RowInfo[]; back: RowInfo[] }>()

  for (const section of floor.sections) {
    const block = section.id.split('-')[1]
    const activeRowNums: number[] = []

    for (let r = 0; r < section.rows.length; r++) {
      if (!isSeatDisabled(`${floorId}_${block}_R${r + 1}_C1`)) {
        activeRowNums.push(r)
      }
    }

    const sectionActiveRows = activeRowNums.length
    const backStart = Math.floor(sectionActiveRows / 2)
    const front: RowInfo[] = []
    const back: RowInfo[] = []

    for (let globalActiveIdx = 0; globalActiveIdx < activeRowNums.length; globalActiveIdx++) {
      const rawRowIdx = activeRowNums[globalActiveIdx]
      const info: RowInfo = {
        floorId,
        block,
        rawRowIdx,
        capacity: section.rows[rawRowIdx].count,
        sectionActiveRows,
        globalActiveIdx,
        rowKey: `${floorId}_${block}_r${rawRowIdx}`,
      }
      if (globalActiveIdx < backStart) front.push(info)
      else back.push(info)
    }

    result.set(block, { front, back })
  }

  return result
}

// Within a single section's zone rows (ordered front-to-back), find the consecutive
// block with minimum rows needed to cover headcount, then minimum waste, then max score.
function findBestBlockInSection(
  headcount: number,
  zoneRows: RowInfo[],
  usedRowKeys: Set<string>,
): { rows: RowInfo[]; waste: number; avgScore: number } | null {
  let best: { rows: RowInfo[]; waste: number; avgScore: number } | null = null

  for (let start = 0; start < zoneRows.length; start++) {
    if (usedRowKeys.has(zoneRows[start].rowKey)) continue

    let capacity = 0
    let scoreWeightedSum = 0
    const blockRows: RowInfo[] = []

    for (let i = start; i < zoneRows.length; i++) {
      const row = zoneRows[i]
      if (usedRowKeys.has(row.rowKey)) break  // consecutive run broken — stop

      const rowScore = getBaseScore(row.floorId, row.rawRowIdx, row.sectionActiveRows)
      capacity += row.capacity
      scoreWeightedSum += rowScore * row.capacity
      blockRows.push(row)

      if (capacity >= headcount) {
        const waste = capacity - headcount
        const avgScore = scoreWeightedSum / capacity
        if (!best || waste < best.waste || (waste === best.waste && avgScore > best.avgScore)) {
          best = { rows: [...blockRows], waste, avgScore }
        }
        break  // minimum rows found for this start; try next start
      }
    }
  }

  return best
}

// Across multiple sections, find the best block.
// frontFirst=true (2F): sort by (firstRow + waste×0.5) so front rows win over small waste gains.
// frontFirst=false (1F): sort by waste ASC then avgScore DESC (original behaviour).
function findBestBlock(
  headcount: number,
  sectionsZoneRows: RowInfo[][],
  usedRowKeys: Set<string>,
  frontFirst = false,
): { rows: RowInfo[]; waste: number; avgScore: number } | null {
  const candidates: { rows: RowInfo[]; waste: number; avgScore: number }[] = []

  for (const zoneRows of sectionsZoneRows) {
    const c = findBestBlockInSection(headcount, zoneRows, usedRowKeys)
    if (c) candidates.push(c)
  }

  if (!candidates.length) return null

  if (frontFirst) {
    candidates.sort((a, b) => {
      const aKey = a.rows[0].globalActiveIdx + a.waste * 0.5
      const bKey = b.rows[0].globalActiveIdx + b.waste * 0.5
      if (aKey !== bKey) return aKey - bKey
      return b.avgScore - a.avgScore
    })
  } else {
    candidates.sort((a, b) =>
      a.waste !== b.waste ? a.waste - b.waste : b.avgScore - a.avgScore,
    )
  }
  return candidates[0]
}

// Enumerate all seat keys in a row block. Every seat in the row is included
// so the entire row displays in the team's color.
function blockToSeatKeys(rows: RowInfo[]): string[] {
  const keys: string[] = []
  for (const row of rows) {
    for (let c = 0; c < row.capacity; c++) {
      const key = `${row.floorId}_${row.block}_R${row.rawRowIdx + 1}_C${c + 1}`
      if (!isSeatDisabled(key)) keys.push(key)
    }
  }
  return keys
}

// Capacity-weighted average of row base scores, plus any per-seat score overrides.
function calcEarnedScore(
  rows: RowInfo[],
  seatKeys: string[],
  overrides: Record<string, number>,
): number {
  if (!seatKeys.length) return 0
  let baseTotal = 0
  let cap = 0
  for (const row of rows) {
    const score = getBaseScore(row.floorId, row.rawRowIdx, row.sectionActiveRows)
    baseTotal += score * row.capacity
    cap += row.capacity
  }
  const baseAvg = cap > 0 ? baseTotal / cap : 0
  if (!Object.keys(overrides).length) return baseAvg
  const overrideTotal = seatKeys.reduce((s, k) => s + (overrides[k] ?? 0), 0)
  return baseAvg + overrideTotal / seatKeys.length
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function generateSeating(
  teams: Team[],
  dynamicOverrides: Record<string, number> = {},
): AlgoResult[] {
  if (!teams.length) return []

  const overrides = { ...SCORE_OVERRIDES, ...dynamicOverrides }

  // Sort by accumulated_score with fixed-amplitude noise.
  // Noise uses max-score as reference so all teams share the same absolute swing range —
  // this lets middle-band teams occasionally cross into top or bottom tiers.
  const base = [...teams].sort((a, b) => a.accumulated_score - b.accumulated_score)
  const maxScore = Math.max(...base.map(t => t.accumulated_score), 1)
  const noiseAmp = maxScore * 0.25

  const sorted = base
    .map(t => ({ ...t, _sort: t.accumulated_score + (Math.random() * 2 - 1) * noiseAmp }))
    .sort((a, b) => a._sort - b._sort)

  const adults = sorted.filter(t => t.team_type === 'ADULT')
  const youth = sorted.filter(t => t.team_type !== 'ADULT')

  const floor1 = buildSectionRowInfos('1F')
  const floor2 = buildSectionRowInfos('2F')

  // Shuffle section order so teams don't land in the same lateral block every round
  const blocks1F = shuffle(['A', 'B', 'C', 'D'])
  const blocks2F = shuffle(['A', 'B', 'C', 'D'])

  const adultZone1F = blocks1F.map(b => floor1.get(b)!.back)
  const youthZone1F = blocks1F.map(b => floor1.get(b)!.front)
  const backZone1F  = blocks1F.map(b => floor1.get(b)!.back)
  // 2F: all sections in one pool, front-first sort applied at allocation time
  const overflow2F  = blocks2F.map(b => [...floor2.get(b)!.front, ...floor2.get(b)!.back])

  const usedRowKeys = new Set<string>()
  const results: AlgoResult[] = []

  function allocate(teamList: Team[], zones: RowInfo[][], frontFirst = false): Team[] {
    const unplaced: Team[] = []
    for (const team of teamList) {
      const best = findBestBlock(team.headcount, zones, usedRowKeys, frontFirst)
      if (!best) { unplaced.push(team); continue }

      for (const row of best.rows) usedRowKeys.add(row.rowKey)
      const seatKeys = blockToSeatKeys(best.rows)

      results.push({
        teamId: team.id,
        seatKeys,
        block: best.rows[0].block,
        floor: best.rows[0].floorId === '1F' ? 1 : 2,
        earnedScore: calcEarnedScore(best.rows, seatKeys, overrides),
      })
    }
    return unplaced
  }

  // 1. Adults: 1F back (waste-first) → 2F (front-first)
  const adultOvf = allocate(adults, adultZone1F)
  allocate(adultOvf, overflow2F, true)

  // 2. Youth: 1F front → 1F back 잔여 (waste-first) → 2F (front-first)
  const youthOvf1 = allocate(youth, youthZone1F)
  const youthOvf2 = allocate(youthOvf1, backZone1F)
  allocate(youthOvf2, overflow2F, true)

  return results
}
