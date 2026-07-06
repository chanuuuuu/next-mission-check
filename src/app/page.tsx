import Link from "next/link";

const LINKS = [
  {
    href: "/accommodation",
    label: "배정된 숙소 조회",
    sub: "01",
    desc: "교회 선택 → 숙소 확인",
  },
  {
    href: "/seat",
    label: "예배당 좌석 배치 조회",
    sub: "02",
    desc: "교회 선택 → 좌석 확인",
  },
  {
    href: "/search-accommodation",
    label: "번호로 숙소 조회",
    sub: "03",
    desc: "본인 번호 입력 → 숙소 확인",
  },
] as const;

export default function Home() {
  return (
    <div className="min-h-screen bg-muted flex justify-center">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground min-h-screen flex flex-col">
        <header className="border-b border-foreground px-6 py-8">
          <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            Mission Process
          </span>
          <h1 className="font-display text-3xl font-bold tracking-tight mt-2 leading-none">
            영동 선교 헬퍼
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            확인할 작업을 선택해주세요.
          </p>
        </header>

        <main className="flex-1 px-6 py-6">
          <div className="grid grid-cols-1 gap-px bg-foreground border border-foreground">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="group bg-background hover:bg-foreground active:bg-foreground hover:text-background active:text-background transition-colors p-8 flex flex-col justify-between min-h-[200px]"
              >
                <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground group-hover:text-background/60 group-active:text-background/60">
                  {l.sub}
                </span>
                <div>
                  <h2 className="font-display text-2xl font-bold tracking-tight mb-2">
                    {l.label}
                  </h2>
                  <p className="text-sm text-muted-foreground group-hover:text-background/60 group-active:text-background/60">
                    {l.desc}
                  </p>
                </div>
                <span className="font-display text-[10px] font-bold tracking-widest uppercase text-brand group-hover:text-background group-active:text-background">
                  ENTER →
                </span>
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
