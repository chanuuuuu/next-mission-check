import { sendProblemReport } from '@/lib/discord'

export const runtime = 'edge'

export async function POST(request: Request) {
  const body = await request
    .json()
    .catch(() => ({}) as Record<string, unknown>)

  await sendProblemReport({
    timestamp: typeof body.timestamp === 'string' ? body.timestamp : undefined,
    status: typeof body.status === 'string' ? body.status : undefined,
    detail: typeof body.detail === 'string' ? body.detail : undefined,
    userAgent: request.headers.get('user-agent') ?? undefined,
  })

  // webhook 실패/미설정과 무관하게 항상 성공 (Fallback)
  return Response.json({ ok: true })
}
