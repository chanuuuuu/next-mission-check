'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { use } from 'react'
import { Church } from '@/types'
import { decodeChurchParam, encodeQRPayload } from '@/lib/encode'

export default function QRPage({ params }: { params: Promise<{ encodedId: string }> }) {
  const { encodedId } = use(params)
  const router = useRouter()
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const churchId = decodeChurchParam(encodedId)

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: () => fetch('/api/churches').then((r) => r.json()),
  })

  const church = churches.find((c) => c.id === churchId)
  const qrValue = churchId ? encodeQRPayload(churchId) : ''

  useEffect(() => {
    if (!churchId) return
    const es = new EventSource(`/api/stream/mobile?churchId=${churchId}`)
    es.onmessage = (e) => {
      if (e.data === 'SCANNED') {
        es.close()
        router.push(`/checkin/${churchId}`)
      }
    }
    return () => es.close()
  }, [churchId, router])

  const handleDownload = () => {
    const qrCanvas = canvasWrapRef.current?.querySelector('canvas')
    if (!qrCanvas) return

    const size = 1080
    const qrSize = size * 0.8
    const offset = size * 0.1

    const output = document.createElement('canvas')
    output.width = size
    output.height = size
    const ctx = output.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(qrCanvas, offset, offset, qrSize, qrSize)

    const a = document.createElement('a')
    a.href = output.toDataURL('image/png')
    a.download = `qr-${church?.name ?? encodedId}.png`
    a.click()
  }

  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">

        {/* 헤더 */}
        <header className="px-6 pt-6 pb-5 border-b border-foreground flex items-start justify-between flex-shrink-0">
          <div>
            <Link
              href="/generate"
              className="font-display text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 교회 다시 선택
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-2 leading-none">
              QR 코드
            </h1>
          </div>
          <span className="bg-brand text-white px-2 py-1 font-display font-bold text-[10px] tracking-widest uppercase mt-1">
            ACTIVE
          </span>
        </header>

        {/* 교회 정보 */}
        {church && (
          <div className="px-6 pt-4 pb-3 border-b border-foreground flex-shrink-0">
            <p className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
              선택된 교회
            </p>
            <p className="text-lg font-bold mt-1">{church.name}</p>
          </div>
        )}

        {/* QR 코드 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-muted/40 overflow-hidden">
          <div ref={canvasWrapRef} className="p-6 bg-white border-2 border-foreground">
            <QRCodeCanvas
              value={qrValue}
              size={240}
              level="H"
              marginSize={1}
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground max-w-xs leading-relaxed">
            카메라에 가져다 대세요.<br />스캔 후 자동으로 다음 단계로 이동합니다.
          </p>
        </div>

        {/* 하단 */}
        <div className="px-6 py-5 border-t border-foreground bg-background space-y-2 flex-shrink-0">
          <button
            onClick={handleDownload}
            className="w-full bg-brand text-white py-4 font-display font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all"
          >
            PNG 다운로드
          </button>
          <p className="text-[11px] text-center text-muted-foreground">
            네트워크 불안정 시 다운로드된 이미지로도 스캔 가능합니다.
          </p>
        </div>

      </div>
    </div>
  )
}
