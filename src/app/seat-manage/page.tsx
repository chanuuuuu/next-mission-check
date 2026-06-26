import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import type { Team } from '@/types/seating'
import AdminClient from './AdminClient'

export const metadata: Metadata = { title: '선교 대원 자리배치 시스템' }

export default async function SeatingPage() {
  const [teams, phases] = await Promise.all([
    sql`
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
    `.then(r => r as Team[]),
    sql`SELECT id FROM phases ORDER BY phase_number DESC LIMIT 1`.then(r => r as { id: number }[]),
  ])

  let savedAssignments: Record<string, number> = {}
  const [latestPhase] = phases
  if (latestPhase) {
    const rows = (await sql`
      SELECT team_id, assigned_seats
      FROM seat_assignments
      WHERE phase_id = ${latestPhase.id}
    `) as { team_id: number; assigned_seats: string[] }[]

    for (const row of rows) {
      for (const key of row.assigned_seats) {
        savedAssignments[key] = row.team_id
      }
    }
  }

  return <AdminClient initialTeams={teams} savedAssignments={savedAssignments} />
}
