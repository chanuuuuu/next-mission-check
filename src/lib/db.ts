import { neon } from '@neondatabase/serverless'

// Edge Runtime(SSE Route Handler) 및 Node.js Route Handler 모두
// neon() HTTP 드라이버를 사용합니다.
// Pool(WebSocket)은 Edge Runtime에서 동작하지 않으므로 사용하지 않습니다.

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL 환경변수가 설정되지 않았습니다.')
}

export const sql = neon(process.env.DATABASE_URL)
