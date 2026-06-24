import { sql } from '@/lib/db'
import type { AlgoResult } from '@/types/seating'

export const runtime = 'edge'

export async function POST(req: Request) {
  const { results } = (await req.json()) as { results: AlgoResult[] }

  if (!results?.length) {
    return Response.json({ error: '배치 결과가 없습니다.' }, { status: 400 })
  }

  // Step 1: create new phase with auto-incremented phase_number
  const [phase] = (await sql`
    INSERT INTO phases (phase_number)
    VALUES ((SELECT COALESCE(MAX(phase_number), 0) + 1 FROM phases))
    RETURNING id
  `) as { id: number }[]

  const phaseId = phase.id

  // Step 2: insert seat_assignments for each team
  for (const result of results) {
    if (!result.seatKeys.length) continue
    const floor = result.floor
    const block = result.block
    const assignedSeats = JSON.stringify(result.seatKeys)
    const earnedScore = result.earnedScore

    await sql`
      INSERT INTO seat_assignments (phase_id, team_id, floor, block, assigned_seats, earned_score)
      VALUES (${phaseId}, ${result.teamId}, ${floor}, ${block}, ${assignedSeats}::jsonb, ${earnedScore})
    `
  }

  // Step 3: update accumulated_score for each team
  for (const result of results) {
    if (!result.seatKeys.length) continue
    await sql`
      UPDATE teams
      SET accumulated_score = accumulated_score + ${result.earnedScore}
      WHERE id = ${result.teamId}
    `
  }

  // Return updated team scores
  const updatedTeams = (await sql`
    SELECT id, accumulated_score FROM teams WHERE id = ANY(${results.map(r => r.teamId)})
  `) as { id: number; accumulated_score: number }[]

  return Response.json({ ok: true, phaseId, teams: updatedTeams })
}
