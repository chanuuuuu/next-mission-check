import { neon } from '@neondatabase/serverless'

export const runtime = 'edge'

const POLL_INTERVAL_MS = 1000

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const churchId = Number(searchParams.get('churchId'))

  if (!churchId || isNaN(churchId)) {
    return new Response('churchId가 필요합니다.', { status: 400 })
  }

  const sql = neon(process.env.DATABASE_URL!)

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: string) =>
        new TextEncoder().encode(`data: ${data}\n\n`)

      // 연결 직후 이미 SCANNED 상태이면 즉시 전송 (다운로드 QR 재접속 케이스)
      const [existing] = await sql`
        SELECT status FROM scanner_sessions
        WHERE church_id = ${churchId}
      `
      if (existing?.status === 'SCANNED' || existing?.status === 'COMPLETED') {
        controller.enqueue(encode('SCANNED'))
        controller.close()
        return
      }

      // 1초 간격 폴링
      const timer = setInterval(async () => {
        try {
          const [row] = await sql`
            SELECT status FROM scanner_sessions
            WHERE church_id = ${churchId}
          `
          if (row?.status === 'SCANNED' || row?.status === 'COMPLETED') {
            controller.enqueue(encode('SCANNED'))
            clearInterval(timer)
            controller.close()
          }
        } catch {
          clearInterval(timer)
          controller.close()
        }
      }, POLL_INTERVAL_MS)

      // 클라이언트 연결 해제 시 정리
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
