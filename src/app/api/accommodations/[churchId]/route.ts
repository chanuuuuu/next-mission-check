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

export async function GET(request: Request, { params }: Props) {
  const { churchId: churchIdParam } = await params
  const churchId = parseInt(churchIdParam, 10)

  if (isNaN(churchId)) {
    return Response.json({ error: '잘못된 church id 입니다.' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const numberParam = searchParams.get('number')

  let rows: AccommodationRow[]

  if (numberParam !== null) {
    const number = parseInt(numberParam, 10)
    if (isNaN(number)) {
      return Response.json({ error: '잘못된 번호입니다.' }, { status: 400 })
    }

    rows = (await sql`
      SELECT a2.building, a2.room, a2.name
      FROM accommodations a1
      JOIN accommodations a2
        ON a2.church_id = a1.church_id
       AND (a1.scope = 0 OR (a2.building = a1.building AND a2.room = a1.room))
      WHERE a1.number = ${number} AND a1.church_id = ${churchId}
      ORDER BY a2.id ASC
    `) as AccommodationRow[]
  } else {
    rows = (await sql`
      SELECT building, room, name
      FROM accommodations
      WHERE church_id = ${churchId}
      ORDER BY id ASC
    `) as AccommodationRow[]
  }

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
