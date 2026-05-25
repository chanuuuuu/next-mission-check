import { sql } from '@/lib/db'
import { PhaseCode, PHASE_LABELS } from '@/types'

export async function GET() {
  const rows = (await sql`
    SELECT value FROM app_settings WHERE key = 'active_phase'
  `) as { value: string }[]

  const phase = (rows[0]?.value ?? '1A') as PhaseCode
  return Response.json({ phase, label: PHASE_LABELS[phase] })
}

export async function PUT(request: Request) {
  const body = await request.json()
  const phase = body?.phase as PhaseCode

  if (!phase || !Object.keys(PHASE_LABELS).includes(phase)) {
    return Response.json({ error: '유효하지 않은 Phase 코드입니다.' }, { status: 400 })
  }

  await sql`
    UPDATE app_settings
    SET value = ${phase}, updated_at = NOW()
    WHERE key = 'active_phase'
  `

  // Phase 전환 시 이전 PENDING 세션 일괄 정리 (5.5 요건)
  await sql`
    DELETE FROM scanner_sessions WHERE status = 'PENDING'
  `

  return Response.json({ phase, label: PHASE_LABELS[phase] })
}
