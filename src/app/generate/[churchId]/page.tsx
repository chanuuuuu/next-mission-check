'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { QRCodeCanvas } from 'qrcode.react'
import { use } from 'react'
import { Church } from '@/types'

export default function QRPage({ params }: { params: Promise<{ churchId: string }> }) {
  const { churchId } = use(params)
  const router = useRouter()
  const canvasWrapRef = useRef<HTMLDivElement>(null)

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: () => fetch('/api/churches').then((r) => r.json()),
  })

  const church = churches.find((c) => c.id === Number(churchId))
  const qrValue = JSON.stringify({ churchId: Number(churchId) })

  // SSE — 스캔 감지 시 체크인 폼으로 자동 이동
  useEffect(() => {
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
    const canvas = canvasWrapRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-${church?.name ?? churchId}.png`
    a.click()
  }

  return (
    <div className="min-h-screen bg-muted flex justify-center">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground min-h-screen flex flex-col animate-[var(--animate-slide-up)]">

        {/* 헤더 */}
        <header className="px-6 pt-8 pb-6 border-b border-foreground flex items-start justify-between">
          <div>
            <Link
              href="/generate"
              className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground hover:text-foreground"
            >
              ← 교회 다시 선택
            </Link>
            <h1 className="text-3xl font-bold tracking-tight mt-2 leading-none">
              QR 코드
            </h1>
          </div>
          <span className="bg-brand text-white px-2 py-1 font-display font-bold text-[10px] tracking-widest uppercase mt-1">
            ACTIVE
          </span>
        </header>

        {/* 교회 정보 */}
        {church && (
          <div className="px-6 pt-6 pb-4 border-b border-foreground">
            <p className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
              선택된 교회
            </p>
            <p className="text-xl font-bold mt-2">{church.name}</p>
          </div>
        )}

        {/* QR 코드 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 bg-muted/40">
          <div ref={canvasWrapRef} className="p-6 bg-white border-2 border-foreground">
            <QRCodeCanvas
              value={qrValue}
              size={240}
              level="H"
              marginSize={1}
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground max-w-xs">
            스태프에게 이 화면을 보여주세요.<br />스캔 후 자동으로 다음 단계로 이동합니다.
          </p>

          {/* 개발 모드: 페이로드 노출 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 w-full max-w-xs border border-dashed border-brand/50 p-3 bg-brand/5">
              <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-brand mb-2">
                DEV — 스캔 페이로드
              </p>
              <code className="text-xs break-all text-foreground">{qrValue}</code>
              <button
                onClick={() => navigator.clipboard.writeText(qrValue)}
                className="mt-2 w-full text-[10px] font-display font-bold uppercase tracking-widest border border-brand text-brand py-1.5 hover:bg-brand hover:text-white transition-colors"
              >
                복사
              </button>
            </div>
          )}
        </div>

        {/* 하단 고정 */}
        <div className="px-6 py-6 border-t border-foreground bg-background space-y-2 sticky bottom-0">
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
