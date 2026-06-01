'use client'

import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal } from 'lucide-react'
import {
  RegistrationFilters,
  type FilterState,
} from '@/components/inquery/registration-filters'
import { RegistrationList, PaymentBadge } from '@/components/inquery/registration-list'
import type { MissionRegistration } from '@/types'

function filtersEqual(a: FilterState, b: FilterState) {
  return a.main === b.main && a.sub1 === b.sub1 && a.sub2 === b.sub2 && a.name === b.name
}

export default function InquiryClient() {
  const [filter, setFilter] = useState<FilterState>({ main: '', sub1: '', sub2: '', name: '' })
  const [activeFilter, setActiveFilter] = useState<FilterState | null>(null)
  const [filterOpen, setFilterOpen] = useState(true)
  const refetchRef = useRef<(() => void) | null>(null)

  function handleSubmit() {
    if (!filter.main || !filter.sub1) return
    if (activeFilter && filtersEqual(filter, activeFilter)) {
      refetchRef.current?.()
    } else {
      setActiveFilter({ ...filter })
    }
    setFilterOpen(false)
  }

  const params = activeFilter
    ? new URLSearchParams({
        department_main: activeFilter.main,
        sub_department_1: activeFilter.sub1,
        sub_department_2: activeFilter.sub2,
        ...(activeFilter.name.trim() ? { name: activeFilter.name.trim() } : {}),
      })
    : null

  const { data: rows = [], isFetching, refetch } = useQuery<MissionRegistration[]>({
    queryKey: ['inquery-results', activeFilter],
    queryFn: () =>
      fetch(`/api/inquery/registrations?${params}`).then((r) => {
        if (!r.ok) throw new Error('조회 실패')
        return r.json()
      }),
    enabled: !!activeFilter,
    staleTime: 0,
  })
  refetchRef.current = refetch

  const filterSummary = activeFilter
    ? [activeFilter.main, activeFilter.sub1, activeFilter.sub2, activeFilter.name]
        .filter(Boolean)
        .join(' · ')
    : null

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <header className="shrink-0 bg-background border-b border-foreground px-4 md:px-12 py-3 md:py-5">
        <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
          2026 영동 선교
        </span>
        <h1 className="font-display text-xl md:text-2xl font-bold tracking-tight mt-0.5">
          등록 조회
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          본인의 등록 및 납부 상태를 확인하세요.
        </p>
      </header>

      <div className="shrink-0 px-4 md:px-12 pt-3">
        {/* 모바일: 접힌 상태 요약 바 */}
        {!filterOpen && filterSummary && (
          <button
            onClick={() => setFilterOpen(true)}
            className="md:hidden w-full flex items-center justify-between bg-background border border-foreground px-4 py-3 text-left mb-3"
          >
            <span className="text-xs font-display font-bold truncate">{filterSummary}</span>
            <span className="inline-flex items-center gap-1 text-[10px] font-display font-bold uppercase tracking-widest text-brand shrink-0 ml-2">
              <SlidersHorizontal size={12} />
              수정
            </span>
          </button>
        )}
        <div className={filterOpen ? '' : 'hidden md:block'}>
          <RegistrationFilters
            value={filter}
            onChange={(v) => setFilter(v)}
            onSubmit={handleSubmit}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-12 py-3 md:py-4">
        {activeFilter ? (
          <>
            <div className="flex items-baseline justify-between mb-3">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">
                조회 결과
              </h2>
              <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                {isFetching ? '조회 중…' : `${rows.length} 건`}
              </span>
            </div>
            <RegistrationList
              rows={rows}
              isFetching={isFetching}
              renderPayment={(r) => <PaymentBadge paid={r.payment_status} />}
            />
          </>
        ) : (
          <div className="py-10 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              조건을 선택하고 조회하세요
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              본부서와 소속을 선택한 뒤 조회 버튼을 누르세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
