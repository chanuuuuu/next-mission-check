import { NextRequest, NextResponse } from 'next/server'
import { sql } from '@/lib/db'
import type { MissionRegistration } from '@/types'

export const runtime = 'edge'

// GET /api/inquery/registrations
// ?department_main=&sub_department_1=&sub_department_2=&name=
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const departmentMain = searchParams.get('department_main')
  const subDept1 = searchParams.get('sub_department_1')
  const subDept2 = searchParams.get('sub_department_2') // 빈 문자열이면 IS NULL 처리
  const name = searchParams.get('name') || null

  if (!departmentMain) {
    return NextResponse.json({ error: 'department_main required' }, { status: 400 })
  }

  // sub_department_1 없으면 부서 전체 조회 (어드민용)
  if (!subDept1) {
    const rows = name
      ? (await sql`
          SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                 name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
          FROM mission_registrations
          WHERE department_main = ${departmentMain} AND name = ${name}
          ORDER BY sub_department_1, sub_department_2, name
        `) as MissionRegistration[]
      : (await sql`
          SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                 name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
          FROM mission_registrations
          WHERE department_main = ${departmentMain}
          ORDER BY sub_department_1, sub_department_2, name
        `) as MissionRegistration[]
    return NextResponse.json(rows)
  }

  const useLikeSub2 = departmentMain === '청장년'

  // sub_department_2 파라미터가 없으면(null) 조건 무시, 빈 문자열('')이면 IS NULL
  const rows = subDept2 === null
    ? name
      ? (await sql`
          SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                 name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
          FROM mission_registrations
          WHERE department_main = ${departmentMain}
            AND sub_department_1 = ${subDept1}
            AND name = ${name}
          ORDER BY name
        `) as MissionRegistration[]
      : (await sql`
          SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                 name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
          FROM mission_registrations
          WHERE department_main = ${departmentMain}
            AND sub_department_1 = ${subDept1}
          ORDER BY name
        `) as MissionRegistration[]
    : subDept2 === ''
      ? name
        ? (await sql`
            SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                   name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
            FROM mission_registrations
            WHERE department_main = ${departmentMain}
              AND sub_department_1 = ${subDept1}
              AND sub_department_2 IS NULL
              AND name = ${name}
            ORDER BY name
          `) as MissionRegistration[]
        : (await sql`
            SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                   name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
            FROM mission_registrations
            WHERE department_main = ${departmentMain}
              AND sub_department_1 = ${subDept1}
              AND sub_department_2 IS NULL
            ORDER BY name
          `) as MissionRegistration[]
      : useLikeSub2
        ? name
          ? (await sql`
              SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                     name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
              FROM mission_registrations
              WHERE department_main = ${departmentMain}
                AND sub_department_1 = ${subDept1}
                AND sub_department_2 ILIKE ${'%' + subDept2 + '%'}
                AND name = ${name}
              ORDER BY name
            `) as MissionRegistration[]
          : (await sql`
              SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                     name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
              FROM mission_registrations
              WHERE department_main = ${departmentMain}
                AND sub_department_1 = ${subDept1}
                AND sub_department_2 ILIKE ${'%' + subDept2 + '%'}
              ORDER BY name
            `) as MissionRegistration[]
        : name
          ? (await sql`
              SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                     name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
              FROM mission_registrations
              WHERE department_main = ${departmentMain}
                AND sub_department_1 = ${subDept1}
                AND sub_department_2 = ${subDept2}
                AND name = ${name}
              ORDER BY name
            `) as MissionRegistration[]
          : (await sql`
              SELECT id, department_main, sub_department_1, sub_department_2, small_group,
                     name, phone_last_four, church_name, arrival_time, use_personal_car, use_car_during_mission, use_return_bus, schedule_survey, payment_status
              FROM mission_registrations
              WHERE department_main = ${departmentMain}
                AND sub_department_1 = ${subDept1}
                AND sub_department_2 = ${subDept2}
              ORDER BY name
            `) as MissionRegistration[]

  return NextResponse.json(rows)
}

// POST /api/inquery/registrations — 관리자 수동 대원 추가
export async function POST(req: NextRequest) {
  const body = await req.json() as Omit<MissionRegistration, 'id' | 'payment_status' | 'created_at' | 'updated_at'>

  const {
    department_main, sub_department_1, sub_department_2,
    small_group, name, phone_last_four, church_name,
    arrival_time, use_personal_car, use_return_bus,
  } = body

  if (!department_main || !sub_department_1 || !name || !phone_last_four) {
    return NextResponse.json({ error: '필수 필드 누락' }, { status: 400 })
  }

  const rows = (await sql`
    INSERT INTO mission_registrations
      (department_main, sub_department_1, sub_department_2, small_group,
       name, phone_last_four, church_name, arrival_time, use_personal_car, use_return_bus)
    VALUES
      (${department_main}, ${sub_department_1}, ${sub_department_2?? null}, ${small_group ?? null},
       ${name}, ${phone_last_four}, ${church_name ?? null}, ${arrival_time ?? null},
       ${use_personal_car ?? null}, ${use_return_bus ?? null})
    ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET
      department_main  = EXCLUDED.department_main,
      small_group      = EXCLUDED.small_group,
      church_name      = EXCLUDED.church_name,
      arrival_time     = EXCLUDED.arrival_time,
      use_personal_car = EXCLUDED.use_personal_car,
      use_return_bus   = EXCLUDED.use_return_bus,
      updated_at       = NOW()
    RETURNING id, name, payment_status
  `) as { id: string; name: string; payment_status: boolean }[]

  return NextResponse.json(rows[0], { status: 201 })
}
