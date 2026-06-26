import type { FloorTab, SeatGroup } from '@/types/seating'

export function locateTeam(
  assignments: Record<string, number>,
  teamId: number,
): SeatGroup[] {
  const groups: Record<string, SeatGroup> = {}
  for (const [key, tid] of Object.entries(assignments)) {
    if (tid !== teamId) continue
    // key format: "1F_A_R3_C5"
    const [floorId, block, rowPart] = key.split('_')
    const rowIdx = parseInt(rowPart.slice(1)) - 1
    const groupKey = `${floorId}_${block}`
    const sectionId = `${floorId}-${block}`
    if (!groups[groupKey]) {
      groups[groupKey] = {
        floor: floorId as FloorTab,
        sectionId,
        sectionLabel: block,
        rowIndices: [rowIdx],
      }
    } else if (!groups[groupKey].rowIndices.includes(rowIdx)) {
      groups[groupKey].rowIndices.push(rowIdx)
    }
  }
  return Object.values(groups)
    .sort((a, b) =>
      a.floor !== b.floor
        ? a.floor.localeCompare(b.floor)
        : a.sectionId.localeCompare(b.sectionId),
    )
    .map((g) => ({ ...g, rowIndices: g.rowIndices.sort((a, b) => a - b) }))
}
