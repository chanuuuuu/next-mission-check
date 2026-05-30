import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import { FORM_MAPPINGS, extractFromNamedValues, parseBooleanField } from '@/config/form-mapping'
import { sendSyncErrorAlert } from '@/lib/discord'

interface WebhookPayload {
  department: string
  namedValues: Record<string, string[]>
}

// POST /api/inquery/sync/webhook — GAS onSubmit 트리거에서 호출
export async function POST(req: NextRequest) {
  const body = await req.json() as WebhookPayload
  const { department, namedValues } = body

  const mapping = FORM_MAPPINGS[department as keyof typeof FORM_MAPPINGS]
  if (!mapping) {
    await sendSyncErrorAlert({ department: department ?? '(없음)', reason: '알 수 없는 부서명' })
    return NextResponse.json({ error: '알 수 없는 부서' }, { status: 400 })
  }

  const fields = extractFromNamedValues(namedValues, mapping)

  if (!fields.sub_department_1 || !fields.name || !fields.phone_last_four) {
    await sendSyncErrorAlert({
      department,
      name: fields.name,
      reason: `필수 필드 누락: sub_department_1=${fields.sub_department_1}, name=${fields.name}, phone=${fields.phone_last_four}`,
    })
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const phoneFour = String(fields.phone_last_four).slice(-4)

  await sql`
    INSERT INTO mission_registrations
      (department_main, sub_department_1, sub_department_2, small_group,
       name, phone_last_four, church_name, arrival_time, use_personal_car, use_return_bus)
    VALUES
      (${department}, ${fields.sub_department_1}, ${fields.sub_department_2 ?? null}, ${fields.small_group ?? null},
       ${fields.name}, ${phoneFour}, ${fields.church_name ?? null}, ${fields.arrival_time ?? null},
       ${parseBooleanField(fields.use_personal_car)}, ${parseBooleanField(fields.use_return_bus)})
    ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET
      department_main  = EXCLUDED.department_main,
      small_group      = EXCLUDED.small_group,
      church_name      = EXCLUDED.church_name,
      arrival_time     = EXCLUDED.arrival_time,
      use_personal_car = EXCLUDED.use_personal_car,
      use_return_bus   = EXCLUDED.use_return_bus,
      updated_at       = NOW()
  `

  return NextResponse.json({ ok: true })
}
