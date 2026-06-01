'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import {
  RegistrationFilters,
  type FilterState,
} from '@/components/inquery/registration-filters'
import { RegistrationList, PaymentToggle } from '@/components/inquery/registration-list'
import type { MissionRegistration } from '@/types'

interface Props {
  initialData: MissionRegistration[]
}

export default function AdminClient({ initialData }: Props) {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<FilterState>({
    main: '2청',
    sub1: '',
    sub2: '',
    name: '',
  })
  const [activeFilter, setActiveFilter] = useState<FilterState>({
    main: '2청',
    sub1: '',
    sub2: '',
    name: '',
  })
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
    queryFn: () =>
      fetch(`/api/inquery/registrations?${params}`).then((r) => {
        if (!r.ok) throw new Error('조회 실패')
        return r.json()
      }),
    initialData:
      activeFilter.main === '2청' && !activeFilter.sub1 ? initialData : undefined,
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
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 bg-background border-b border-foreground px-6 md:px-12 py-4 md:py-5 flex flex-col md:flex-row md:items-end justify-between gap-3">
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

      <div className="shrink-0 px-6 md:px-12 pt-4">
        <RegistrationFilters
          value={filter}
          onChange={(v) => setFilter(v)}
          onSubmit={() => setActiveFilter({ ...filter })}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-12 py-3 md:py-4">
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">
            등록자 목록
          </h2>
          <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
            {isFetching ? '조회 중…' : `${rows.length} 명`}
          </span>
        </div>
        <RegistrationList
          rows={rows}
          isFetching={isFetching}
          renderPayment={(r) => (
            <PaymentToggle
              paid={r.payment_status}
              onToggle={() => togglePayment.mutate(r.id)}
            />
          )}
        />
      </div>
    </div>
  )
}
