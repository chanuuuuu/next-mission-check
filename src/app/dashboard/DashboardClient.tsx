'use client'

import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Church, Checkin } from '@/types'
import { PHASE_LABELS, PhaseCode } from '@/types'

interface Props {
  initialChurches: Church[]
  initialCheckins: Checkin[]
  initialPhase: string
}

export function DashboardClient({ initialChurches, initialCheckins, initialPhase }: Props) {
  const queryClient = useQueryClient()

  const { data: churches = initialChurches } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: () => fetch('/api/churches').then((r) => r.json()),
    initialData: initialChurches,
  })

  const { data: phaseData } = useQuery<{ phase: string; label: string }>({
    queryKey: ['phase'],
    queryFn: () => fetch('/api/settings/phase').then((r) => r.json()),
    initialData: { phase: initialPhase, label: PHASE_LABELS[initialPhase as PhaseCode] },
  })

  const phase = phaseData?.phase ?? initialPhase

  const { data: checkins = initialCheckins } = useQuery<Checkin[]>({
    queryKey: ['checkins', phase],
    queryFn: () => fetch(`/api/checkins?phase=${phase}`).then((r) => r.json()),
    initialData: initialCheckins,
  })

  // SSE — 새 체크인 또는 Phase 변경 감지
  useEffect(() => {
    const es = new EventSource('/api/stream/dashboard')
    es.onmessage = (e) => {
      if (e.data === 'REFRESH') {
        queryClient.invalidateQueries({ queryKey: ['checkins'] })
        queryClient.invalidateQueries({ queryKey: ['phase'] })
      }
    }
    return () => es.close()
  }, [queryClient])

  const arrivedIds = new Set(checkins.map((c) => c.church_id))
  const pending = churches.filter((c) => !arrivedIds.has(c.id))
  const arrived = [...checkins].sort(
    (a, b) => new Date(a.checked_in_at).getTime() - new Date(b.checked_in_at).getTime()
  )

  const phaseLabel = PHASE_LABELS[phase as PhaseCode] ?? phase

  return (
    <div className="min-h-screen bg-background flex flex-col">

      {/* 헤더 */}
      <header className="px-6 md:px-12 py-5 border-b border-foreground flex flex-col md:flex-row md:items-center justify-between gap-3 bg-background">
        <div className="flex items-center gap-6">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            체크인 현황판
          </p>
          <h1 className="text-2xl font-bold tracking-tight">실시간 대시보드</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="font-display text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              진행률
            </p>
            <p className="font-display text-xl font-bold tabular-nums">
              {arrived.length} / {churches.length}
            </p>
          </div>
          <span className="bg-brand text-white px-4 py-2 font-display font-bold text-sm tracking-tight">
            {phaseLabel} · {phase}
          </span>
        </div>
      </header>

      {/* 2분할 레이아웃 */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-2 border-t border-foreground">

        {/* 좌측 — 미도착 */}
        <section className="bg-foreground text-background p-8 md:p-12 flex flex-col">
          <div className="flex justify-between items-end border-b border-background/20 pb-4 mb-8">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-background/50">
                미도착
              </p>
              <p className="text-4xl md:text-5xl font-bold tracking-tight mt-2">
                {pending.length}
                <span className="font-display text-5xl md:text-7xl font-light tabular-nums text-background/40 ml-2">
                  개 교회
                </span>
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {pending.map((church) => (
              <div
                key={church.id}
                className="flex justify-between items-center px-4 py-3 border border-background/10 hover:border-background/40 transition-colors"
              >
                <span className="font-medium opacity-80">{church.name}</span>
                <span className="font-mono text-[10px] tracking-widest text-background/40">
                  PENDING
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* 우측 — 도착 완료 */}
        <section className="bg-background p-8 md:p-12 flex flex-col border-t lg:border-t-0 lg:border-l border-foreground">
          <div className="flex justify-between items-end border-b border-foreground/20 pb-4 mb-8">
            <div>
              <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-brand">
                도착 완료
              </p>
              <p className="text-4xl md:text-5xl font-bold tracking-tight mt-2 text-brand">
                {arrived.length}
                <span className="font-display text-5xl md:text-7xl font-light tabular-nums text-brand/40 ml-2">
                  개 교회
                </span>
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1">
            {arrived.map((checkin) => {
              const church = churches.find((c) => c.id === checkin.church_id)
              return (
                <div
                  key={checkin.id}
                  className="flex items-center gap-3 px-4 py-3 border border-brand/20 hover:border-brand/40 transition-colors"
                >
                  <span className="size-2 bg-brand flex-shrink-0" />
                  <span className="font-bold font-display">
                    {church?.name ?? '알 수 없음'}
                    <span className="text-brand ml-1">({checkin.total_count}명)</span>
                  </span>
                  <span className="ml-auto font-display text-xs font-bold tabular-nums text-muted-foreground">
                    {new Date(checkin.checked_in_at).toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

      </main>
    </div>
  )
}
