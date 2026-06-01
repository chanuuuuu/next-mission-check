import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const runtime = 'edge'

type RouteContext = { params: Promise<{ id: string }> }

// PATCH /api/inquery/registrations/[id]/payment — 납부 상태 토글
export async function PATCH(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params

  const rows = (await sql`
    UPDATE mission_registrations
    SET payment_status = NOT payment_status,
        updated_at     = NOW()
    WHERE id = ${id}
    RETURNING id, payment_status
  `) as { id: string; payment_status: boolean }[]

  if (rows.length === 0) {
    return NextResponse.json({ error: '대원을 찾을 수 없습니다' }, { status: 404 })
  }

  return NextResponse.json(rows[0])
}
