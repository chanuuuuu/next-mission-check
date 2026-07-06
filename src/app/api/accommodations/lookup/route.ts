import { sql } from '@/lib/db'

export const runtime = 'edge'

interface LookupRow {
  church_id: number
  church_name: string
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const numberParam = searchParams.get('number')
  const number = numberParam !== null ? parseInt(numberParam, 10) : NaN

  if (isNaN(number)) {
    return Response.json({ error: '잘못된 번호입니다.' }, { status: 400 })
  }

  const rows = (await sql`
    SELECT a.church_id, c.name AS church_name
    FROM accommodations a
    JOIN churches c ON c.id = a.church_id
    WHERE a.number = ${number}
    LIMIT 1
  `) as LookupRow[]

  const target = rows[0]
  if (!target) {
    return Response.json({ error: '등록되지 않은 번호입니다.' }, { status: 404 })
  }

  return Response.json({ churchId: target.church_id, churchName: target.church_name })
}
