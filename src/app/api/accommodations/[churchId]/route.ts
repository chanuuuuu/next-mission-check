import { sql } from '@/lib/db'
import { AccommodationBuilding } from '@/types'

export const runtime = 'edge'

interface AccommodationRow {
  building: string
  room: number
  name: string
}

interface Props {
  params: Promise<{ churchId: string }>
}

export async function GET(_request: Request, { params }: Props) {
  const { churchId: churchIdParam } = await params
  const churchId = parseInt(churchIdParam, 10)

  if (isNaN(churchId)) {
    return Response.json({ error: '잘못된 church id 입니다.' }, { status: 400 })
  }

  const rows = (await sql`
    SELECT building, room, name
    FROM accommodations
    WHERE church_id = ${churchId}
    ORDER BY id ASC
  `) as AccommodationRow[]

  const buildings: AccommodationBuilding[] = []
  const buildingIndex = new Map<string, number>()

  for (const row of rows) {
    let bIdx = buildingIndex.get(row.building)
    if (bIdx === undefined) {
      bIdx = buildings.length
      buildingIndex.set(row.building, bIdx)
      buildings.push({ building: row.building, rooms: [] })
    }
    const building = buildings[bIdx]
    let roomEntry = building.rooms.find((r) => r.room === row.room)
    if (!roomEntry) {
      roomEntry = { room: row.room, names: [] }
      building.rooms.push(roomEntry)
    }
    roomEntry.names.push(row.name)
  }

  for (const building of buildings) {
    building.rooms.sort((a, b) => a.room - b.room)
  }

  return Response.json(buildings)
}
