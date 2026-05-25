'use client'

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'

const MockScannerPanel = dynamic(
  () => import('./MockScannerPanel').then((m) => m.MockScannerPanel),
  { ssr: false }
)

type ScanStatus = 'idle' | 'scanning' | 'error'

export default function ScannerPage() {
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null)
  const [status, setStatus] = useState<ScanStatus>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const isDev = process.env.NODE_ENV === 'development'

  const handleScanSuccess = async (decodedText: string) => {
    if (isProcessing) return
    setIsProcessing(true)
    setStatus('scanning')

    // 카메라 즉시 숨김
    await scannerRef.current?.stop().catch(() => {})

    let churchId: number | null = null
    try {
      const payload = JSON.parse(decodedText)
      churchId = Number(payload.churchId)
      if (!churchId || isNaN(churchId)) throw new Error('invalid')
    } catch {
      setStatus('error')
      setErrorMsg('유효하지 않은 QR 코드입니다.')
      await restartCamera()
      return
    }

    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ churchId }),
    })

    if (!res.ok) {
      const data = await res.json()
      setStatus('error')
      setErrorMsg(data.error ?? '처리 중 오류가 발생했습니다.')
      await restartCamera()
      return
    }

    setStatus('idle')
    // 2초 후 카메라 재활성화
    setTimeout(() => restartCamera(), 2000)
  }

  const restartCamera = async () => {
    setIsProcessing(false)
    setStatus('idle')
    startCamera()
  }

  const startCamera = () => {
    import('html5-qrcode').then(({ Html5Qrcode }) => {
      const scanner = new Html5Qrcode('qr-reader')
      scannerRef.current = scanner
      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 280 } },
          handleScanSuccess,
          () => {}
        )
        .catch(() => {
          setStatus('error')
          setErrorMsg('카메라 접근 권한이 필요합니다.')
        })
    })
  }

  useEffect(() => {
    startCamera()
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">

      {/* 헤더 */}
      <header className="px-6 md:px-12 py-5 border-b border-white/15 flex justify-between items-center">
        <div className="flex items-center gap-6">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-white/50">
            체크인 · STEP 2
          </p>
          <p className="text-lg font-bold tracking-tight hidden md:block">웹캠 스캐너</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="size-2 rounded-full bg-brand animate-pulse" />
          <span className="font-display text-[10px] font-bold tracking-widest uppercase">
            {isProcessing ? 'PROCESSING' : 'LIVE'}
          </span>
        </div>
      </header>

      {/* 메인 뷰포트 */}
      <main className="flex-1 relative grid place-items-center overflow-hidden p-4 md:p-12">
        <div className={`w-full max-w-5xl ${isDev ? 'flex gap-6 items-start justify-center' : ''}`}>

          {/* 카메라 영역 */}
          <div className="relative flex-1 aspect-video bg-neutral-900 overflow-hidden border border-white/10">
            {/* html5-qrcode 마운트 대상 */}
            <div id="qr-reader" className="w-full h-full" />

            {/* 스캔 프레임 오버레이 */}
            {!isProcessing && (
              <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="relative size-72">
                  <span className="absolute -top-1 -left-1 size-6 border-t-2 border-l-2 border-brand" />
                  <span className="absolute -top-1 -right-1 size-6 border-t-2 border-r-2 border-brand" />
                  <span className="absolute -bottom-1 -left-1 size-6 border-b-2 border-l-2 border-brand" />
                  <span className="absolute -bottom-1 -right-1 size-6 border-b-2 border-r-2 border-brand" />
                  <span className="absolute inset-0 bg-brand animate-[var(--animate-pulse-scan)]" />
                  <span className="absolute left-0 right-0 top-1/2 h-px bg-brand shadow-[0_0_12px_var(--brand)]" />
                </div>
              </div>
            )}

            {/* 처리 중 오버레이 */}
            {isProcessing && (
              <div className="absolute inset-0 bg-black/80 grid place-items-center">
                <div className="text-center">
                  <span className="size-3 rounded-full bg-brand animate-pulse inline-block mb-3" />
                  <p className="font-display font-bold text-lg uppercase tracking-tight">
                    인식 중...
                  </p>
                  <p className="text-xs text-white/50 mt-1.5">잠시만 기다려주세요</p>
                </div>
              </div>
            )}

            {/* 상태 배지 */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className="bg-black/70 backdrop-blur-sm border border-white/20 px-3 py-1 font-display text-[10px] font-bold tracking-widest uppercase">
                {status === 'error' ? 'ERROR' : 'SCANNING'}
              </span>
            </div>
          </div>

          {/* 개발 모드 패널 */}
          {isDev && (
            <MockScannerPanel onScan={handleScanSuccess} />
          )}
        </div>

        {/* 에러 툴팁 */}
        {status === 'error' && errorMsg && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-destructive text-white px-4 py-2 text-sm font-bold font-display">
            ⚠ {errorMsg}
          </div>
        )}
      </main>

      {/* 푸터 */}
      <footer className="px-6 md:px-12 py-6 border-t border-white/15 flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex items-center gap-4">
          <span className="size-3 rounded-full bg-brand animate-pulse" />
          <div>
            <p className="font-display font-bold text-lg leading-none uppercase tracking-tight">
              QR 코드를 화면에 비춰주세요
            </p>
            <p className="text-xs text-white/50 mt-1.5">
              스캔 완료 시 대원의 휴대폰이 자동으로 전환됩니다
            </p>
          </div>
        </div>
        <button className="bg-brand text-white px-6 py-4 font-display font-bold uppercase tracking-widest text-xs hover:brightness-110 transition-all">
          문제가 있어요
        </button>
      </footer>

    </div>
  )
}
