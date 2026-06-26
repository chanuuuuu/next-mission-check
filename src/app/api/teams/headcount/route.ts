import { sql } from '@/lib/db'

export const runtime = 'edge'

export async function PATCH(req: Request) {
  const body = (await req.json()) as { team_id: number; headcount: number }[]

  for (const { team_id, headcount } of body) {
    await sql`UPDATE teams SET headcount = ${headcount} WHERE id = ${team_id}`
  }

  return Response.json({ ok: true })
}
