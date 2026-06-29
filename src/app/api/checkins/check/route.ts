import { sql } from '@/lib/db'

export const runtime = 'edge'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const churchId = Number(searchParams.get('churchId'))

  if (!churchId || isNaN(churchId)) {
    return Response.json({ error: 'churchId가 필요합니다.' }, { status: 400 })
  }

  const [setting] = await sql`SELECT value FROM app_settings WHERE key = 'active_phase'`
  const phase = setting?.value
  if (!phase) return Response.json({ alreadyCheckedIn: false })

  const [row] = await sql`
    SELECT 1 FROM checkins
    WHERE church_id = ${churchId} AND phase_code = ${phase}
    LIMIT 1
  `

  return Response.json({ alreadyCheckedIn: !!row })
}
