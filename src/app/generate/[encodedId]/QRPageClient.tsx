'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { QRCodeCanvas } from 'qrcode.react'
import { Church } from '@/types'
import { encodeQRPayload, encodeCheckinParam } from '@/lib/encode'

interface Props {
  church: Church
  phase: string
  initialIsCheckedIn: boolean
}

export default function QRPageClient({ church, phase, initialIsCheckedIn }: Props) {
  const router = useRouter()
  const canvasWrapRef = useRef<HTMLDivElement>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toastVisible, setToastVisible] = useState(false)
  const isCheckedIn = initialIsCheckedIn
  const qrValue = encodeQRPayload(church.id)

  useEffect(() => {
    if (!phase || isCheckedIn) return
    const es = new EventSource(`/api/stream/mobile?churchId=${church.id}`)
    es.onmessage = (e) => {
      if (e.data === 'SCANNED') {
        es.close()
        router.push(`/checkin/${encodeCheckinParam(church.name, church.id)}`)
      }
    }
    return () => es.close()
  }, [church, phase, isCheckedIn, router])

  const showToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToastVisible(true)
    toastTimer.current = setTimeout(() => setToastVisible(false), 2000)
  }

  const handleShare = async () => {
    const url = window.location.href
    const title = `${church.name} QR 체크인`

    if (navigator.share) {
      try {
        await navigator.share({ title, url })
      } catch {
        // 사용자가 취소한 경우
      }
    } else {
      await navigator.clipboard.writeText(url)
      showToast()
    }
  }

  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-120 bg-background border-x border-foreground h-full flex flex-col animate-(--animate-slide-up)">

        {/* 헤더 */}
        <header className="px-6 pt-6 pb-5 border-b border-foreground flex items-start justify-between shrink-0">
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
          <span className={`px-2 py-1 font-display font-bold text-[10px] tracking-widest uppercase mt-1 ${
            isCheckedIn
              ? 'bg-foreground text-background'
              : 'bg-brand text-white'
          }`}>
            {isCheckedIn ? 'DONE' : 'ACTIVE'}
          </span>
        </header>

        {/* 교회 정보 */}
        <div className="px-6 pt-4 pb-3 border-b border-foreground shrink-0">
          <p className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
            선택된 교회
          </p>
          <p className="text-lg font-bold mt-1">{church.name}</p>
          {church.address && (
            <p className="text-sm text-muted-foreground mt-0.5">{church.address}</p>
          )}
        </div>

        {/* 체크인 완료 배너 */}
        {isCheckedIn && (
          <div className="px-6 py-3 bg-foreground/5 border-b border-foreground flex items-center gap-2 shrink-0">
            <span className="size-2 bg-foreground shrink-0" />
            <span className="font-display font-bold text-sm">체크인이 완료된 교회입니다.</span>
          </div>
        )}

        {/* QR 코드 */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-muted/40 overflow-hidden">
          <div ref={canvasWrapRef} className={`p-6 bg-white border-2 ${isCheckedIn ? 'border-foreground/30 opacity-50' : 'border-foreground'}`}>
            <QRCodeCanvas
              value={qrValue}
              size={240}
              level="H"
              marginSize={1}
            />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground max-w-xs leading-relaxed">
            {isCheckedIn
              ? '체크인이 완료되었습니다.'
              : '카메라에 가져다 대세요.\n스캔 후 자동으로 다음 단계로 이동합니다.'}
          </p>
        </div>

        {/* 하단 */}
        <div className="px-6 py-5 border-t border-foreground bg-background shrink-0">
          <button
            onClick={handleShare}
            className="w-full bg-brand text-white py-4 font-display font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all"
          >
            공유하기
          </button>
        </div>

      </div>

      {/* 바텀 토스트 */}
      <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-foreground text-background px-5 py-3 font-display font-bold text-sm tracking-wide whitespace-nowrap transition-all duration-300 ${toastVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        URL이 복사되었습니다
      </div>

    </div>
  )
}
