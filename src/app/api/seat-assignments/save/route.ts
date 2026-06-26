import { sql } from '@/lib/db'
import type { AlgoResult, JinAlgoResult } from '@/types/seating'

export const runtime = 'edge'

export async function POST(req: Request) {
  const body = await req.json()

  if (body.mode === 'jin') {
    return saveJinMode(body.jinResults as JinAlgoResult[])
  }

  return saveTeamMode(body.results as AlgoResult[])
}

async function saveTeamMode(results: AlgoResult[]) {
  if (!results?.length) {
    return Response.json({ error: '배치 결과가 없습니다.' }, { status: 400 })
  }

  const [phase] = (await sql`
    INSERT INTO phases (phase_number)
    VALUES ((SELECT COALESCE(MAX(phase_number), 0) + 1 FROM phases))
    RETURNING id
  `) as { id: number }[]

  const phaseId = phase.id

  for (const result of results) {
    if (!result.seatKeys.length) continue
    const assignedSeats = JSON.stringify(result.seatKeys)
    await sql`
      INSERT INTO seat_assignments (phase_id, team_id, floor, block, assigned_seats, earned_score)
      VALUES (${phaseId}, ${result.teamId}, ${result.floor}, ${result.block}, ${assignedSeats}::jsonb, ${result.earnedScore})
    `
  }

  for (const result of results) {
    if (!result.seatKeys.length) continue
    await sql`
      UPDATE teams
      SET accumulated_score = accumulated_score + ${result.earnedScore}
      WHERE id = ${result.teamId}
    `
  }

  const updatedTeams = (await sql`
    SELECT id, accumulated_score FROM teams WHERE id = ANY(${results.map(r => r.teamId)})
  `) as { id: number; accumulated_score: number }[]

  return Response.json({ ok: true, phaseId, teams: updatedTeams })
}

async function saveJinMode(jinResults: JinAlgoResult[]) {
  if (!jinResults?.length) {
    return Response.json({ error: '배치 결과가 없습니다.' }, { status: 400 })
  }

  const [phase] = (await sql`
    INSERT INTO phases (phase_number, assignment_mode)
    VALUES ((SELECT COALESCE(MAX(phase_number), 0) + 1 FROM phases), 'jin')
    RETURNING id
  `) as { id: number }[]

  const phaseId = phase.id

  for (const result of jinResults) {
    if (!result.seatKeys.length) continue
    const assignedSeats = JSON.stringify(result.seatKeys)
    await sql`
      INSERT INTO seat_assignments (phase_id, jin_name, floor, block, assigned_seats, earned_score)
      VALUES (${phaseId}, ${result.jinName}, ${result.floor}, ${result.block}, ${assignedSeats}::jsonb, ${result.earnedScore})
    `
  }

  // Accumulate earnedScore to every member team individually
  for (const result of jinResults) {
    if (!result.seatKeys.length) continue
    for (const teamId of result.memberTeamIds) {
      await sql`
        UPDATE teams
        SET accumulated_score = accumulated_score + ${result.earnedScore}
        WHERE id = ${teamId}
      `
    }
  }

  const allTeamIds = [...new Set(jinResults.flatMap(r => r.memberTeamIds))]
  const updatedTeams = (await sql`
    SELECT id, accumulated_score FROM teams WHERE id = ANY(${allTeamIds})
  `) as { id: number; accumulated_score: number }[]

  return Response.json({ ok: true, phaseId, teams: updatedTeams })
}
