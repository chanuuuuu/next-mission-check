import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

const POLL_INTERVAL_MS = 1000

export async function GET(request: Request) {
  const sql = neon(process.env.DATABASE_URL!)

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: string) =>
        new TextEncoder().encode(`data: ${data}\n\n`)

      let initialized = false
      let lastCheckedAt: string | null = null
      let lastUpdatedAt: string | null = null
      let lastPhase: string | null = null

      const normalizeTs = (raw: unknown): string | null =>
        raw instanceof Date
          ? raw.toISOString()
          : raw != null ? String(raw) : null

      const tick = async () => {
        try {
          const [settings] = await sql`
            SELECT value FROM app_settings WHERE key = 'active_phase'
          `
          const currentPhase = settings?.value ?? '1A'

          const [latest] = await sql`
            SELECT
              MAX(checked_in_at) AS checked_in_at,
              MAX(updated_at)    AS updated_at
            FROM checkins
            WHERE phase_code = ${currentPhase}
          `
          const currentCheckedAt = normalizeTs(latest?.checked_in_at)
          // meal_called 토글 등 UPDATE 반영 (PATCH가 updated_at 갱신)
          const currentUpdatedAt = normalizeTs(latest?.updated_at)

          if (initialized) {
            const phaseChanged = lastPhase !== currentPhase
            const newCheckin = currentCheckedAt !== lastCheckedAt
            const rowUpdated = currentUpdatedAt !== lastUpdatedAt
            if (phaseChanged || newCheckin || rowUpdated) {
              controller.enqueue(encode('REFRESH'))
            }
          }

          lastPhase = currentPhase
          lastCheckedAt = currentCheckedAt
          lastUpdatedAt = currentUpdatedAt
          initialized = true
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
