import { SEAT_CONFIG } from './seatConfig'

export type RowDef = { count: number }
export type SectionDef = { id: string; label: string; rows: RowDef[] }
export type FloorDef = { id: '1F' | '2F'; label: string; sections: SectionDef[] }

const BLOCK_LABELS = ['A', 'B', 'C', 'D'] as const

function buildFloors(): FloorDef[] {
  const floors: [keyof typeof SEAT_CONFIG, '1F' | '2F', string][] = [
    ['first', '1F', '1층'],
    ['second', '2F', '2층'],
  ]
  return floors.map(([key, id, label]) => ({
    id,
    label,
    sections: (SEAT_CONFIG[key] as readonly (readonly number[])[]).map((blockRows, blockIdx) => {
      const blockLabel = BLOCK_LABELS[blockIdx]
      return {
        id: `${id}-${blockLabel}`,
        label: blockLabel,
        rows: blockRows.map((count) => ({ count })),
      }
    }),
  }))
}

export const FLOORS: FloorDef[] = buildFloors()

// Returns seat key in format "1F_A_R1_C1" (1-indexed)
export function seatId(sectionId: string, rowIdx: number, colIdx: number): string {
  const [floorId, block] = sectionId.split('-')
  return `${floorId}_${block}_R${rowIdx + 1}_C${colIdx + 1}`
}
