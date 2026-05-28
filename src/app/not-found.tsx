import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">

        <header className="px-6 pt-8 pb-6 border-b border-foreground flex-shrink-0">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            오류 · ERROR
          </p>
          <h1 className="text-xl font-bold tracking-tight mt-2 leading-none">
            페이지를 찾을 수 없습니다
          </h1>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center px-6">
          <p className="font-display text-[clamp(6rem,30vw,10rem)] font-bold leading-none tabular-nums text-foreground/10 select-none">
            404
          </p>
          <p className="text-sm text-muted-foreground text-center mt-6 leading-relaxed">
            요청하신 경로가 존재하지 않거나<br />이동되었습니다.
          </p>
        </div>

        <div className="px-6 py-6 border-t border-foreground flex-shrink-0">
          <Link
            href="/generate"
            className="block w-full bg-brand text-white py-4 font-display font-bold uppercase tracking-widest text-sm text-center transition-colors hover:bg-brand/90"
          >
            체크인 시작하기
          </Link>
        </div>

      </div>
    </div>
  )
}
