'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Bus, Car } from 'lucide-react'
import { RegistrationFilters, type FilterState } from '@/components/inquery/registration-filters'
import type { MissionRegistration } from '@/types'

export default function InquiryClient() {
  const [filter, setFilter] = useState<FilterState>({ main: '', sub1: '', sub2: '', name: '' })
  const [submitted, setSubmitted] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterState | null>(null)

  function handleSubmit() {
    if (!filter.main || !filter.sub1) return
    setActiveFilter({ ...filter })
    setSubmitted(true)
  }

  const params = activeFilter
    ? new URLSearchParams({
        department_main: activeFilter.main,
        sub_department_1: activeFilter.sub1,
        sub_department_2: activeFilter.sub2,
        ...(activeFilter.name.trim() ? { name: activeFilter.name.trim() } : {}),
      })
    : null

  const { data: rows = [], isFetching } = useQuery<MissionRegistration[]>({
    queryKey: ['inquery-results', activeFilter],
    queryFn: () => fetch(`/api/inquery/registrations?${params}`).then((r) => r.json()),
    enabled: submitted && !!activeFilter,
  })

  return (
    <>
      <header className="bg-background border-b border-foreground px-6 md:px-12 py-6">
        <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
          07 / Inquiry
        </span>
        <h1 className="font-display text-3xl md:text-4xl font-bold tracking-tight mt-2">
          등록 조회
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          본인의 등록 및 납부 상태를 확인하세요.
        </p>
      </header>

      <main className="px-6 md:px-12 py-8 md:py-10 space-y-6">
        <RegistrationFilters
          value={filter}
          onChange={(v) => {
            setFilter(v)
            setSubmitted(false)
          }}
          onSubmit={handleSubmit}
        />

        {submitted && (
          <>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">
                조회 결과
              </h2>
              <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                {isFetching ? '조회 중…' : `${rows.length} 건`}
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
                    <PaymentBadge paid={r.payment_status} />
                  </div>
                  <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                    <Field
                      label="교회 / 목장"
                      value={r.church_name ?? r.small_group ?? '-'}
                      full
                    />
                    <Field
                      label="소속"
                      value={`${r.sub_department_1}${r.sub_department_2 ? ' / ' + r.sub_department_2 : ''}`}
                      full
                    />
                    {r.arrival_time && (
                      <Field
                        label="참여 일정"
                        value={<span className="tabular-nums">{r.arrival_time} 도착</span>}
                        full
                      />
                    )}
                    <Field
                      label="자차 이용"
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          {r.use_personal_car ? <Car size={12} /> : null}
                          <span className="font-display font-bold">
                            {r.use_personal_car === null ? '-' : r.use_personal_car ? 'O' : 'X'}
                          </span>
                        </span>
                      }
                    />
                    <Field
                      label="복귀 버스"
                      value={
                        <span className="inline-flex items-center gap-1.5">
                          {r.use_return_bus ? <Bus size={12} /> : null}
                          <span className="font-display font-bold">
                            {r.use_return_bus === null ? '-' : r.use_return_bus ? 'O' : 'X'}
                          </span>
                        </span>
                      }
                    />
                  </dl>
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
                      <th className="px-6 py-4 text-right">납부</th>
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
                          <PaymentBadge paid={r.payment_status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!isFetching && rows.length === 0 && <EmptyState />}
              </div>
            </div>
          </>
        )}

        {!submitted && (
          <div className="px-6 py-16 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-widest text-muted-foreground">
              조건을 선택하고 조회하세요
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              본부서와 소속을 선택한 뒤 조회 버튼을 누르세요.
            </p>
          </div>
        )}
      </main>
    </>
  )
}

function Field({
  label,
  value,
  full,
}: {
  label: string
  value: React.ReactNode
  full?: boolean
}) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <dt className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5">{value}</dd>
    </div>
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

function PaymentBadge({ paid }: { paid: boolean }) {
  if (paid) {
    return (
      <span className="inline-flex items-center bg-foreground text-background px-2.5 py-1 font-display font-bold text-[10px] uppercase tracking-widest">
        납부 완료
      </span>
    )
  }
  return (
    <span className="inline-flex items-center bg-brand text-white px-2.5 py-1 font-display font-bold text-[10px] uppercase tracking-widest">
      미납
    </span>
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
