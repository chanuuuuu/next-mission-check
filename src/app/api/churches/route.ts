import { sql } from '@/lib/db'
import { Church } from '@/types'

export async function GET() {
  const rows = (await sql`
    SELECT id, name, address, team_name, team_type, jin_name, created_at
    FROM churches
    ORDER BY name ASC
  `) as Church[]

  return Response.json(rows)
}
