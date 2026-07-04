import { sql } from '@/lib/db'
import type { DayKey } from '@/types/seating'

export const runtime = 'edge'

export async function PATCH(req: Request) {
  const body = (await req.json()) as { team_id: number; headcount: number; day?: DayKey }[]

  for (const { team_id, headcount, day } of body) {
    if (day === 'thu') {
      await sql`UPDATE teams SET headcount_thu = ${headcount} WHERE id = ${team_id}`
    } else if (day === 'fri') {
      await sql`UPDATE teams SET headcount_fri = ${headcount} WHERE id = ${team_id}`
    } else if (day === 'sat') {
      await sql`UPDATE teams SET headcount_sat = ${headcount} WHERE id = ${team_id}`
    } else if (day === 'sun') {
      await sql`UPDATE teams SET headcount_sun = ${headcount} WHERE id = ${team_id}`
    } else {
      await sql`UPDATE teams SET headcount = ${headcount} WHERE id = ${team_id}`
    }
  }

  return Response.json({ ok: true })
}
