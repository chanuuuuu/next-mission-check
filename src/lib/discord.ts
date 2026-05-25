const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL

export async function sendScanErrorAlert(params: {
  scannedText: string
  reason: string
  timestamp?: string
}) {
  if (!WEBHOOK_URL) return

  const ts = params.timestamp ?? new Date().toISOString()

  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '체크인 시스템',
      embeds: [
        {
          title: '⚠️ QR 스캔 오류 감지',
          color: 0xff4444,
          fields: [
            { name: '오류 유형', value: params.reason, inline: true },
            { name: '발생 시각', value: ts, inline: true },
            {
              name: '인식된 텍스트',
              value: params.scannedText || '(없음)',
              inline: false,
            },
          ],
        },
      ],
    }),
  }).catch(() => {
    // Webhook 실패가 메인 흐름을 막으면 안 됨
  })
}
