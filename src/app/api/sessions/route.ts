import { sql } from '@/lib/db'
import { sendScanErrorAlert } from '@/lib/discord'
import { decodeQRPayload } from '@/lib/encode'

export async function POST(request: Request) {
  const body = await request.json()
  const decoded = decodeQRPayload(body?.payload ?? '')
  const churchId = decoded?.churchId ?? 0

  if (!churchId || isNaN(churchId)) {
    const raw = JSON.stringify(body)
    await sendScanErrorAlert({
      scannedText: raw,
      reason: 'QR 데이터에 유효한 churchId가 없습니다.',
    })
    return Response.json({ error: '유효하지 않은 QR 데이터입니다.' }, { status: 400 })
  }

  // 교회 존재 여부 확인
  const [church] = await sql`
    SELECT id FROM churches WHERE id = ${churchId}
  `

  if (!church) {
    await sendScanErrorAlert({
      scannedText: JSON.stringify(body),
      reason: `DB에 존재하지 않는 교회입니다. (churchId: ${churchId})`,
    })
    return Response.json({ error: '등록되지 않은 교회입니다.' }, { status: 404 })
  }

  // UPSERT: 세션 레코드가 없으면 생성, 있으면 SCANNED로 업데이트
  await sql`
    INSERT INTO scanner_sessions (church_id, status, scanned_at, updated_at)
    VALUES (${churchId}, 'SCANNED', NOW(), NOW())
    ON CONFLICT (church_id) DO UPDATE
      SET status     = 'SCANNED',
          scanned_at = NOW(),
          updated_at = NOW()
  `

  return Response.json({ ok: true })
}
