import { encodeQRPayload } from '@/lib/encode'
import { sql } from '@/lib/db'
import { Church } from '@/types'

// 개발/테스트용 — 교회별 QR payload 조회
// GET /api/debug/payload          → 전체 교회 목록 + payload
// GET /api/debug/payload?id=1     → 특정 교회 payload
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  const churches = (await sql`SELECT id, name FROM churches ORDER BY id`) as Church[]

  if (id) {
    const church = churches.find((c) => c.id === Number(id))
    if (!church) return Response.json({ error: '교회를 찾을 수 없습니다.' }, { status: 404 })
    return Response.json({ id: church.id, name: church.name, payload: encodeQRPayload(church.id) })
  }

  return Response.json(
    churches.map((c) => ({ id: c.id, name: c.name, payload: encodeQRPayload(c.id) }))
  )
}
