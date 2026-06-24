import { sql } from '@/lib/db'
import type { Team } from '@/types/seating'

export const runtime = 'edge'

export async function GET() {
  const teams = (await sql`
    SELECT
      t.id,
      t.church_id,
      c.name         AS church_name,
      c.team_name,
      c.team_type,
      t.headcount,
      t.accumulated_score
    FROM teams t
    JOIN churches c ON t.church_id = c.id
    ORDER BY t.accumulated_score ASC
  `) as Team[]

  return Response.json(teams)
}
