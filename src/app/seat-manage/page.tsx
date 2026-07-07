import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import type { Team } from '@/types/seating'
import AdminClient from './AdminClient'
import PinGate from './PinGate'

export const dynamic = 'force-dynamic'
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
    `.then(r => r as Team[]),
    sql`SELECT id, assignment_mode FROM phases ORDER BY phase_number DESC LIMIT 1`.then(
      r => r as { id: number; assignment_mode: 'team' | 'jin' }[],
    ),
  ])

  const [latestPhase] = phases
  const savedMode = latestPhase?.assignment_mode ?? 'jin'

  let savedAssignments: Record<string, number> = {}
  let savedJinAssignments: Record<string, string> = {}

  if (latestPhase) {
    if (savedMode === 'jin') {
      const rows = (await sql`
        SELECT jin_name, assigned_seats
        FROM seat_assignments
        WHERE phase_id = ${latestPhase.id}
      `) as { jin_name: string; assigned_seats: string[] }[]

      for (const row of rows) {
        for (const key of row.assigned_seats) {
          savedJinAssignments[key] = row.jin_name
        }
      }
    } else {
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
  }

  return (
    <PinGate>
      <AdminClient
        initialTeams={teams}
        savedAssignments={savedAssignments}
        savedJinAssignments={savedJinAssignments}
        savedMode={savedMode}
      />
    </PinGate>
  )
}
