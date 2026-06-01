import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export const runtime = 'edge'

export interface DepartmentHierarchyRow {
  department_main: string
  sub_department_1: string
  sub_department_2: string | null
}

// GET /api/inquery/departments — 부서 트리 전체 조회 (필터 초기화용, 1회 fetch)
export async function GET() {
  const rows = (await sql`
    SELECT department_main, sub_department_1, sub_department_2
    FROM department_hierarchy
    ORDER BY department_main, sort_order, sub_department_1, sub_department_2
  `) as DepartmentHierarchyRow[]

  return NextResponse.json(rows)
}
