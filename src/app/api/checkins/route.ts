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
      ch.is_all_arrived, ch.total_count, ch.breakfast_count,
      ch.report_notes, ch.meal_called, ch.dynamic_questions,
      ch.checked_in_at, ch.updated_at
    FROM checkins ch
    WHERE ch.phase_code = ${phase}
    ORDER BY ch.checked_in_at ASC
  `) as Checkin[]

  return Response.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const { church_id, phase_code, is_all_arrived, total_count, breakfast_count, report_notes, dynamic_questions } = body

  if (!church_id || !phase_code) {
    return Response.json({ error: 'church_id, phase_code는 필수입니다.' }, { status: 400 })
  }

  try {
    const rows = (await sql`
      INSERT INTO checkins
        (church_id, phase_code, is_all_arrived, total_count, breakfast_count, report_notes, dynamic_questions)
      VALUES
        (${church_id}, ${phase_code}, ${is_all_arrived ?? false},
         ${total_count ?? 0}, ${breakfast_count ?? 0}, ${report_notes ?? null}, ${dynamic_questions ?? null})
      RETURNING *
    `) as Checkin[]

    await sql`DELETE FROM scanner_sessions WHERE church_id = ${church_id}`

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

export async function PATCH(request: Request) {
  const body = await request.json()
  const { church_id, phase_code, meal_called } = body

  if (!church_id || !phase_code) {
    return Response.json({ error: 'church_id, phase_code는 필수입니다.' }, { status: 400 })
  }

  // 저녁 phase는 기존 행 UPDATE 경로, 아침 phase는 소스 행이 없으므로 신규 생성.
  // 아침 총인원/차감은 직전 저녁 breakfast_count(보드에서 계산)를 사용하므로
  // 신규 행의 total_count/breakfast_count는 기본 0으로 둔다.
  const rows = (await sql`
    INSERT INTO checkins (church_id, phase_code, meal_called)
    VALUES (${church_id}, ${phase_code}, ${meal_called ?? false})
    ON CONFLICT (church_id, phase_code)
    DO UPDATE SET meal_called = EXCLUDED.meal_called, updated_at = now()
    RETURNING *
  `) as Checkin[]

  return Response.json(rows[0])
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  )
}
