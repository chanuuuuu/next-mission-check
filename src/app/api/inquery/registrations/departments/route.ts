import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'

// GET /api/inquery/registrations/departments
// ?department_main=X                   → sub_department_1 목록
// ?department_main=X&sub_department_1=Y → sub_department_2 목록 (없으면 빈 배열)
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const departmentMain = searchParams.get('department_main')
  const subDept1 = searchParams.get('sub_department_1')

  if (!departmentMain) {
    return NextResponse.json({ error: 'department_main required' }, { status: 400 })
  }

  if (!subDept1) {
    const rows = (await sql`
      SELECT DISTINCT sub_department_1
      FROM mission_registrations
      WHERE department_main = ${departmentMain}
      ORDER BY sub_department_1
    `) as { sub_department_1: string }[]
    return NextResponse.json(rows.map((r) => r.sub_department_1))
  }

  const rows = (await sql`
    SELECT DISTINCT sub_department_2
    FROM mission_registrations
    WHERE department_main = ${departmentMain}
      AND sub_department_1 = ${subDept1}
      AND sub_department_2 IS NOT NULL
    ORDER BY sub_department_2
  `) as { sub_department_2: string }[]
  return NextResponse.json(rows.map((r) => r.sub_department_2))
}
