// Usage: node scripts/generate-qr.mjs
// Generates one QR PNG per church into qr-output/
// Reads DATABASE_URL from .env.local

import { createReadStream } from 'fs'
import { readFile, mkdir, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import QRCode from 'qrcode'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// --- env loading (.env.local) ---
async function loadEnv() {
  try {
    const raw = await readFile(join(ROOT, '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!process.env[key]) process.env[key] = val
    }
  } catch {
    // .env.local 없으면 무시 (환경변수가 이미 설정된 경우)
  }
}

// --- base64url encode (encode.ts의 toBase64url과 동일) ---
function toBase64url(str) {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

function encodeQRPayload(churchId) {
  return toBase64url(JSON.stringify({ h: 'sc', id: churchId }))
}

// --- main ---
async function main() {
  await loadEnv()

  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    console.error('DATABASE_URL 환경변수가 없습니다.')
    process.exit(1)
  }

  // Neon HTTP driver (@neondatabase/serverless)
  const { neon } = await import('@neondatabase/serverless')
  const sql = neon(dbUrl)

  const churches = await sql`SELECT id, name FROM churches ORDER BY name`
  console.log(`총 ${churches.length}개 교회 QR 생성 시작...\n`)

  const outDir = join(ROOT, 'qr-output')
  await mkdir(outDir, { recursive: true })

  for (const church of churches) {
    const qrValue = encodeQRPayload(church.id)
    const filePath = join(outDir, `${church.name}_QR.png`)

    await QRCode.toFile(filePath, qrValue, {
      type: 'png',
      width: 400,
      margin: 2,
      errorCorrectionLevel: 'M',
    })

    console.log(`✓  ${church.name}`)
  }

  console.log(`\n완료 → qr-output/ (${churches.length}개 파일)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
