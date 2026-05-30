'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bus, Car, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { RegistrationFilters, type FilterState } from '@/components/inquery/registration-filters'
import type { MissionRegistration } from '@/types'

interface Props {
  initialData: MissionRegistration[]
}

export default function AdminClient({ initialData }: Props) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterState>({ main: '2청', sub1: '', sub2: '', name: '' })
  const [activeFilter, setActiveFilter] = useState<FilterState>({ main: '2청', sub1: '', sub2: '', name: '' })
  const [syncing, setSyncing] = useState(false)

  const queryKey = ['inquery-admin', activeFilter]

  const params = new URLSearchParams({
    department_main: activeFilter.main || '2청',
    ...(activeFilter.sub1 ? { sub_department_1: activeFilter.sub1 } : {}),
    ...(activeFilter.sub2 ? { sub_department_2: activeFilter.sub2 } : {}),
    ...(activeFilter.name.trim() ? { name: activeFilter.name.trim() } : {}),
  })

  const { data: rows = initialData, isFetching } = useQuery<MissionRegistration[]>({
    queryKey,
    queryFn: () => fetch(`/api/inquery/registrations?${params}`).then((r) => r.json()),
    initialData: activeFilter.main === '2청' && !activeFilter.sub1 ? initialData : undefined,
  })

  const togglePayment = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/inquery/registrations/${id}/payment`, { method: 'PATCH' }).then((r) => r.json()),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<MissionRegistration[]>(queryKey)
      queryClient.setQueryData<MissionRegistration[]>(queryKey, (old) =>
        old?.map((m) => (m.id === id ? { ...m, payment_status: !m.payment_status } : m))
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev)
      toast.error('납부 상태 변경에 실패했습니다.')
    },
    onSuccess: () => toast.success('납부 상태가 변경되었습니다.'),
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/inquery/sync/manual', { method: 'POST' })
      const data = (await res.json()) as { synced: number; failed: number }
      toast.success(`동기화 완료 · ${data.synced}건 보정${data.failed ? ` (실패 ${data.failed}건)` : ''}`)
      queryClient.invalidateQueries({ queryKey })
    } catch {
      toast.error('동기화 중 오류가 발생했습니다.')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <>
      <header className="bg-background border-b border-foreground px-6 md:px-12 py-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            08 / Registration Admin
          </span>
          <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">
            등록 관리
          </h1>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="inline-flex items-center justify-center gap-2 bg-brand text-white px-5 py-3 font-display font-bold uppercase tracking-widest text-xs hover:bg-foreground transition-colors disabled:opacity-60"
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? '동기화 중…' : '누락 데이터 강제 동기화'}
        </button>
      </header>

      <main className="px-6 md:px-12 py-8 md:py-10 space-y-6">
        <RegistrationFilters
          value={filter}
          onChange={(v) => setFilter(v)}
          onSubmit={() => setActiveFilter({ ...filter })}
        />

        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">
            등록자 목록
          </h2>
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
            {isFetching ? '조회 중…' : `${rows.length} 명`}
          </span>
        </div>

        {/* Mobile cards */}
        <div className="grid grid-cols-1 gap-3 md:hidden">
          {rows.map((r) => (
            <article key={r.id} className="bg-background border border-foreground p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold">{r.name}</div>
                  <div className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                    ****-{r.phone_last_four}
                  </div>
                </div>
                <PaymentToggle
                  paid={r.payment_status}
                  onToggle={() => togglePayment.mutate(r.id)}
                />
              </div>
              <div className="mt-3 text-xs">{r.church_name ?? r.small_group ?? '-'}</div>
              <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                {r.arrival_time && (
                  <span className="tabular-nums">{r.arrival_time} 도착</span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Car size={12} />
                  <span className="font-display font-bold">
                    {r.use_personal_car === null ? '-' : r.use_personal_car ? 'O' : 'X'}
                  </span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Bus size={12} />
                  <span className="font-display font-bold">
                    {r.use_return_bus === null ? '-' : r.use_return_bus ? 'O' : 'X'}
                  </span>
                </span>
              </div>
            </article>
          ))}
          {!isFetching && rows.length === 0 && <EmptyState />}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block bg-background border border-foreground overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50">
                <tr className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                  <th className="px-6 py-4">이름</th>
                  <th className="px-6 py-4">연락처</th>
                  <th className="px-6 py-4">교회 / 목장</th>
                  <th className="px-6 py-4">참여 일정</th>
                  <th className="px-6 py-4 text-center">자차</th>
                  <th className="px-6 py-4 text-center">복귀 버스</th>
                  <th className="px-6 py-4 text-right">납부 토글</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-foreground/10">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/40">
                    <td className="px-6 py-4 font-medium">{r.name}</td>
                    <td className="px-6 py-4 text-muted-foreground tabular-nums">
                      ****-{r.phone_last_four}
                    </td>
                    <td className="px-6 py-4">{r.church_name ?? r.small_group ?? '-'}</td>
                    <td className="px-6 py-4 tabular-nums">
                      {r.arrival_time ? `${r.arrival_time} 도착` : '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <OxCell on={r.use_personal_car} icon={<Car size={14} />} />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <OxCell on={r.use_return_bus} icon={<Bus size={14} />} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <PaymentToggle
                        paid={r.payment_status}
                        onToggle={() => togglePayment.mutate(r.id)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!isFetching && rows.length === 0 && <EmptyState />}
          </div>
        </div>
      </main>
    </>
  )
}

function OxCell({ on, icon }: { on: boolean | null; icon: React.ReactNode }) {
  if (on === null) return <span className="text-muted-foreground/50 font-display font-bold">-</span>
  return (
    <span
      className={
        'inline-flex items-center gap-1.5 font-display font-bold ' +
        (on ? 'text-foreground' : 'text-muted-foreground/50')
      }
    >
      {on ? icon : null}
      {on ? 'O' : 'X'}
    </span>
  )
}

function PaymentToggle({ paid, onToggle }: { paid: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-3 group"
      aria-label="납부 상태 토글"
    >
      <span
        className={
          'inline-flex items-center gap-1.5 px-2.5 py-1 font-display font-bold text-[10px] uppercase tracking-widest ' +
          (paid ? 'bg-foreground text-background' : 'bg-brand text-white')
        }
      >
        {paid ? '납부 완료' : '미납'}
      </span>
      <span
        className={
          'relative inline-block w-10 h-5 border-2 border-foreground transition-colors ' +
          (paid ? 'bg-foreground' : 'bg-background')
        }
      >
        <span
          className={
            'absolute top-0.5 w-3 h-3 transition-all ' +
            (paid ? 'left-5 bg-background' : 'left-0.5 bg-brand')
          }
        />
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
        결과 없음
      </p>
      <p className="text-xs text-muted-foreground mt-2">검색 조건을 변경해 보세요.</p>
    </div>
  )
}
