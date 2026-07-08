import { sql } from '@/lib/db'
import { AccommodationBuilding } from '@/types'

interface AccommodationRow {
  building: string
  room: number
  name: string
}

function groupIntoBuildings(rows: AccommodationRow[]): AccommodationBuilding[] {
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

  return buildings
}

export async function getAccommodationBuildings(
  churchId: number,
  number?: number
): Promise<AccommodationBuilding[]> {
  let rows: AccommodationRow[]

  if (number !== undefined) {
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

  return groupIntoBuildings(rows)
}

interface AccommodationRowWithChurch extends AccommodationRow {
  church_id: number
  self_building: string
  self_room: number
}

export async function getAccommodationByNumber(
  number: number
): Promise<{
  churchId: number
  buildings: AccommodationBuilding[]
  highlight: { building: string; room: number }
} | null> {
  const rows = (await sql`
    SELECT a2.building, a2.room, a2.name, a1.church_id,
           a1.building AS self_building, a1.room AS self_room
    FROM accommodations a1
    JOIN accommodations a2
      ON a2.church_id = a1.church_id
     AND (a1.scope = 0 OR (a2.building = a1.building AND a2.room = a1.room))
    WHERE a1.number = ${number}
    ORDER BY a2.id ASC
  `) as AccommodationRowWithChurch[]

  if (rows.length === 0) return null

  return {
    churchId: rows[0].church_id,
    buildings: groupIntoBuildings(rows),
    highlight: { building: rows[0].self_building, room: rows[0].self_room },
  }
}
