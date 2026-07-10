import { sql } from '@/lib/db'

export const runtime = 'edge'

// 팀별 기준인원(baseline) 조회
// day 매핑: 1일차→목(thu), 2일차→금(fri), 3일차→토(sat), 4일차→일(sun)
// 요일 컬럼이 NULL이면 기준인원 0 (base headcount로 폴백하지 않음)
// teams는 교회 1:1 이므로 church_id별 baseline 1개
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const phase = searchParams.get('phase') ?? ''
  const day = phase.charAt(0) // '1' | '2' | '3' | '4'

  try {
    let rows: { church_id: number; baseline: number }[] = []

    if (day === '1') {
      rows = (await sql`SELECT church_id, COALESCE(headcount_thu, 0) AS baseline FROM teams`) as {
        church_id: number
        baseline: number
      }[]
    } else if (day === '2') {
      rows = (await sql`SELECT church_id, COALESCE(headcount_fri, 0) AS baseline FROM teams`) as {
        church_id: number
        baseline: number
      }[]
    } else if (day === '3') {
      rows = (await sql`SELECT church_id, COALESCE(headcount_sat, 0) AS baseline FROM teams`) as {
        church_id: number
        baseline: number
      }[]
    } else if (day === '4') {
      rows = (await sql`SELECT church_id, COALESCE(headcount_sun, 0) AS baseline FROM teams`) as {
        church_id: number
        baseline: number
      }[]
    } else {
      // 유효하지 않은 phase — 안전 폴백
      return Response.json([])
    }

    return Response.json(rows)
  } catch {
    // 조회 실패 시 빈 배열로 폴백 (기준인원 미표시, 화면 자체는 유지)
    return Response.json([])
  }
}
