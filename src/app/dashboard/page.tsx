import Link from "next/link";

const LINKS = [
  {
    href: "/scanner",
    label: "웹캠 스캐너",
    sub: "01 · PC",
    desc: "현장 데스크 QR 카메라 스캔",
  },
  {
    href: "/checkin-admin",
    label: "체크인 관리자",
    sub: "02 · 반응형",
    desc: "Phase 전환 · 수기 체크인 입력",
  },
  {
    href: "/checkin-board",
    label: "체크인 현황판",
    sub: "03 · PC",
    desc: "실시간 도착 현황 모니터링",
  },
  {
    href: "/seat-manage",
    label: "좌석 배치 관리",
    sub: "04 · 반응형",
    desc: "성전 좌석 자동 배치 · 관리",
  },
  {
    href: "/seat-view",
    label: "좌석 현황 조회",
    sub: "05 · PC",
    desc: "배치된 좌석 현황 뷰",
  },
] as const;

export default function DashboardHub() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-foreground px-6 py-6 md:px-12 flex items-end justify-between">
        <div>
          <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            Mission Ops
          </span>
          <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mt-2">
            영동 선교 허브
          </h1>
        </div>
        <span className="hidden md:inline-flex bg-brand text-white px-3 py-1 font-display font-bold text-xs">
          v1.0
        </span>
      </header>

      <main className="px-6 py-12 md:px-12 md:py-16">
        <p className="max-w-2xl text-muted-foreground mb-12">
          운영 작업을 선택해주세요.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-foreground border border-foreground">
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
  );
}
