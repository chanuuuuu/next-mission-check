import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import type { Team } from '@/types/seating'
import { buildJinUnits } from '../seat-manage/utils/jinGrouping'
import ViewClient from './ViewClient'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: '선교 대원 자리배치 시스템' }

export default async function SeatingViewPage() {
  const [teams, [latestPhase]] = await Promise.all([
    sql`
      SELECT
        t.id,
        t.church_id,
        c.name         AS church_name,
        c.team_name,
        c.team_type,
        c.jin_name,
        t.headcount,
        t.accumulated_score
      FROM teams t
      JOIN churches c ON t.church_id = c.id
      ORDER BY t.accumulated_score ASC
    `.then(r => r as Team[]),
    sql`
      SELECT id, assignment_mode FROM phases ORDER BY phase_number DESC LIMIT 1
    `.then(r => r as { id: number; assignment_mode: 'team' | 'jin' }[]),
  ])

  let assignments: Record<string, number> = {}
  let teamToJinId: Record<number, number> = {}

  if (latestPhase) {
    if (latestPhase.assignment_mode === 'jin') {
      const rows = (await sql`
        SELECT jin_name, assigned_seats
        FROM seat_assignments
        WHERE phase_id = ${latestPhase.id}
      `) as { jin_name: string; assigned_seats: string[] }[]

      const jinUnits = buildJinUnits(teams)
      const idMap = new Map(jinUnits.map(u => [u.jinName, u.syntheticId]))

      for (const row of rows) {
        const synId = idMap.get(row.jin_name) ?? -1
        for (const key of row.assigned_seats) assignments[key] = synId
      }

      for (const unit of jinUnits) {
        for (const teamId of unit.memberTeamIds) {
          teamToJinId[teamId] = unit.syntheticId
        }
      }
    } else {
      const rows = (await sql`
        SELECT team_id, assigned_seats
        FROM seat_assignments
        WHERE phase_id = ${latestPhase.id}
      `) as { team_id: number; assigned_seats: string[] }[]

      for (const row of rows) {
        for (const key of row.assigned_seats) assignments[key] = row.team_id
      }
    }
  }

  return <ViewClient teams={teams} assignments={assignments} teamToJinId={teamToJinId} />
}
