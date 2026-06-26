import { sql } from '@/lib/db'
import { Church } from '@/types'

export async function GET() {
  const rows = (await sql`
    SELECT id, name, address, team_name, team_type, jin_name, created_at
    FROM churches
    ORDER BY name ASC
  `) as Church[]

  return Response.json(rows)
}

export async function POST(request: Request) {
  const body = await request.json()
  const name = (body?.name ?? '').trim()
  const address = (body?.address ?? '').trim() || null

  if (!name) {
    return Response.json({ error: '교회명을 입력해주세요.' }, { status: 400 })
  }

  const rows = (await sql`
    INSERT INTO churches (name, address)
    VALUES (${name}, ${address})
    RETURNING id, name, address, created_at
  `) as Church[]

  return Response.json(rows[0], { status: 201 })
}
