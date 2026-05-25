import { sql } from '@/lib/db'
import { Church } from '@/types'

export async function GET() {
  const rows = (await sql`
    SELECT id, name, created_at
    FROM churches
    ORDER BY name ASC
  `) as Church[]

  return Response.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = (body?.name ?? '').trim()

  if (!name) {
    return Response.json({ error: '교회명을 입력해주세요.' }, { status: 400 })
  }

  const rows = (await sql`
    INSERT INTO churches (name)
    VALUES (${name})
    ON CONFLICT (name) DO NOTHING
    RETURNING id, name, created_at
  `) as Church[]

  if (rows.length === 0) {
    return Response.json({ error: '이미 등록된 교회명입니다.' }, { status: 409 })
  }

  return Response.json(rows[0], { status: 201 })
}
