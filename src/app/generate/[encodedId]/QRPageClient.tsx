'use client'

import Link from 'next/link'
import { QRCodeCanvas } from 'qrcode.react'
import { Church } from '@/types'
import { encodeQRPayload } from '@/lib/encode'

interface Props {
  church: Church
}

export function QRPageClient({ church }: Props) {
  const qrValue = encodeQRPayload(church.id)

  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">

        <header className="px-6 pt-6 pb-5 border-b border-foreground flex items-start justify-between shrink-0">
          <div>
            <Link
              href="/generate"
              className="font-display text-sm font-bold tracking-tight text-muted-foreground hover:text-foreground transition-colors"
            >
              ← 교회 다시 선택
            </Link>
            <h1 className="text-xl font-bold tracking-tight mt-2 leading-none">QR 코드</h1>
          </div>
          <span className="px-2 py-1 font-display font-bold text-[10px] tracking-widest uppercase mt-1 bg-foreground/10 text-foreground">
            수동
          </span>
        </header>

        <div className="px-6 pt-4 pb-3 border-b border-foreground shrink-0">
          <p className="font-display text-[10px] font-bold tracking-[0.2em] uppercase text-muted-foreground">
            선택된 교회
          </p>
          <p className="text-lg font-bold mt-1">{church.name}</p>
          {church.address && (
            <p className="text-sm text-muted-foreground mt-0.5">{church.address}</p>
          )}
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 bg-muted/40 overflow-hidden">
          <div className="p-6 bg-white border-2 border-foreground">
            <QRCodeCanvas value={qrValue} size={240} level="M" marginSize={1} />
          </div>
          <p className="mt-6 text-center text-sm text-muted-foreground max-w-xs leading-relaxed">
            스캐너 화면에 QR을 가져다 대주세요.
          </p>
        </div>

      </div>
    </div>
  )
}
