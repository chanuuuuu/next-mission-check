export type RowDef = { count: number }
export type SectionDef = { id: string; label: string; rows: RowDef[] }
export type FloorDef = { id: '1F' | '2F'; label: string; sections: SectionDef[] }

export const FLOORS: FloorDef[] = [
  {
    id: '1F',
    label: '1층',
    sections: [
      { id: '1F-A', label: 'A', rows: [...Array(7).fill({ count: 12 }), { count: 7 }] },
      { id: '1F-B', label: 'B', rows: [...Array(8).fill({ count: 10 }), ...Array(10).fill({ count: 12 })] },
      { id: '1F-C', label: 'C', rows: Array(19).fill({ count: 12 }) },
      {
        id: '1F-D',
        label: 'D',
        rows: [
          { count: 12 },
          { count: 12 },
          ...Array(13).fill({ count: 12 }),
          { count: 7 },
        ],
      },
    ],
  },
  {
    id: '2F',
    label: '2층',
    sections: [
      { id: '2F-A', label: 'A', rows: [...Array(2).fill({ count: 8 }), ...Array(10).fill({ count: 10 })] },
      { id: '2F-B', label: 'B', rows: [...Array(2).fill({ count: 10 }), ...Array(10).fill({ count: 12 })] },
      { id: '2F-C', label: 'C', rows: [...Array(2).fill({ count: 10 }), ...Array(10).fill({ count: 12 })] },
      { id: '2F-D', label: 'D', rows: [...Array(2).fill({ count: 8 }), ...Array(10).fill({ count: 10 })] },
    ],
  },
]

// Returns seat key in format "1F_A_R1_C1" (1-indexed)
export function seatId(sectionId: string, rowIdx: number, colIdx: number): string {
  const [floorId, block] = sectionId.split('-')
  return `${floorId}_${block}_R${rowIdx + 1}_C${colIdx + 1}`
}
