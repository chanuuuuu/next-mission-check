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
      c.jin_name,
      t.headcount,
      t.accumulated_score,
      t.headcount_thu,
      t.headcount_fri,
      t.headcount_sat,
      t.headcount_sun
    FROM teams t
    JOIN churches c ON t.church_id = c.id
    ORDER BY t.accumulated_score ASC
  `) as Team[]

  return Response.json(teams)
}
