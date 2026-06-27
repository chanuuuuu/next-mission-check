'use client'

import Link from 'next/link'

export default function SeatingError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen bg-background text-foreground pb-12">
      <header className="border-b border-foreground px-4 py-2 sticky top-0 bg-background z-10">
        <Link
          href="/"
          className="font-display text-sm font-bold tracking-tight text-foreground/50 hover:text-foreground transition-colors block mb-0.5"
        >
          ← 처음으로
        </Link>
        <h1 className="font-display text-base font-bold tracking-tight">
          내 좌석 찾기
        </h1>
      </header>

      <div className="px-4 py-16 flex flex-col items-center gap-6 text-center">
        <p className="font-display text-[5rem] font-bold leading-none text-foreground/10 select-none">
          오류
        </p>
        <div className="space-y-1">
          <p className="font-display text-sm font-bold">좌석 정보를 불러오지 못했습니다</p>
          <p className="text-xs text-foreground/50">일시적인 오류입니다. 다시 시도해 주세요.</p>
        </div>
        <button
          onClick={reset}
          className="border border-foreground font-display font-bold text-sm px-6 py-2.5 hover:bg-foreground hover:text-background transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  )
}
