import { sql } from '@/lib/db'
import { Checkin } from '@/types'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase')

  if (!phase) {
    return Response.json({ error: 'phase 파라미터가 필요합니다.' }, { status: 400 })
  }

  const rows = (await sql`
    SELECT
      ch.id, ch.church_id, ch.phase_code,
      ch.is_all_arrived, ch.total_count,
      ch.report_notes, ch.dynamic_questions,
      ch.checked_in_at, ch.updated_at
    FROM checkins ch
    WHERE ch.phase_code = ${phase}
    ORDER BY ch.checked_in_at ASC
  `) as Checkin[]

  return Response.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { church_id, phase_code, is_all_arrived, total_count, report_notes, dynamic_questions } = body

  if (!church_id || !phase_code) {
    return Response.json({ error: 'church_id, phase_code는 필수입니다.' }, { status: 400 })
  }

  try {
    const rows = (await sql`
      INSERT INTO checkins
        (church_id, phase_code, is_all_arrived, total_count, report_notes, dynamic_questions)
      VALUES
        (${church_id}, ${phase_code}, ${is_all_arrived ?? false},
         ${total_count ?? 0}, ${report_notes ?? null}, ${dynamic_questions ?? null})
      RETURNING *
    `) as Checkin[]

    return Response.json(rows[0], { status: 201 })
  } catch (err: unknown) {
    // PostgreSQL 유니크 제약 위반 (unique_church_phase)
    if (isUniqueViolation(err)) {
      return Response.json(
        { error: '이미 해당 Phase에 체크인이 완료된 교회입니다.' },
        { status: 409 }
      )
    }
    throw err
  }
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}
