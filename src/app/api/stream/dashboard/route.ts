import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

const POLL_INTERVAL_MS = 2000

export async function GET(request: Request) {
  const sql = neon(process.env.DATABASE_URL!)

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: string) =>
        new TextEncoder().encode(`data: ${data}\n\n`)

      // 폴링 기준값: 마지막으로 본 체크인 시각 + 현재 active_phase
      let lastCheckedAt: string | null = null
      let lastPhase: string | null = null

      const tick = async () => {
        try {
          const [settings] = await sql`
            SELECT value FROM app_settings WHERE key = 'active_phase'
          `
          const currentPhase = settings?.value ?? '1A'

          const [latest] = await sql`
            SELECT checked_in_at FROM checkins
            WHERE phase_code = ${currentPhase}
            ORDER BY checked_in_at DESC
            LIMIT 1
          `
          const currentCheckedAt = latest?.checked_in_at ?? null

          const phaseChanged = lastPhase !== null && lastPhase !== currentPhase
          const newCheckin = lastCheckedAt !== null && currentCheckedAt !== lastCheckedAt

          if (phaseChanged || newCheckin) {
            controller.enqueue(encode('REFRESH'))
          }

          lastPhase = currentPhase
          lastCheckedAt = currentCheckedAt
        } catch {
          clearInterval(timer)
          controller.close()
        }
      }

      // 최초 기준값 세팅 (REFRESH 없이)
      await tick()

      const timer = setInterval(tick, POLL_INTERVAL_MS)

      request.signal.addEventListener('abort', () => {
        clearInterval(timer)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
