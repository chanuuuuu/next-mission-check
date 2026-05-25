'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Church, Checkin, PhaseCode, PHASE_LABELS } from '@/types'

const PHASES = Object.entries(PHASE_LABELS) as [PhaseCode, string][]

function ManualRow({
  church,
  phaseCode,
  isCheckedIn,
}: {
  church: Church
  phaseCode: string
  isCheckedIn: boolean
}) {
  const queryClient = useQueryClient()
  const [count, setCount] = useState('')

  const mutation = useMutation({
    mutationFn: () =>
      fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_id: church.id,
          phase_code: phaseCode,
          is_all_arrived: true,
          total_count: Number(count) || 0,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
      setCount('')
    },
  })

  return (
    <div className="border border-foreground/15 p-3 flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{church.name}</p>
        {isCheckedIn && (
          <p className="text-[10px] font-display font-bold tracking-widest uppercase text-brand mt-0.5">
            완료
          </p>
        )}
      </div>
      <input
        type="number"
        value={count}
        onChange={(e) => setCount(e.target.value.replace(/\D/g, ''))}
        placeholder="인원"
        disabled={isCheckedIn}
        className="w-14 border border-foreground/20 px-2 py-1.5 text-sm outline-none focus:border-foreground bg-transparent disabled:opacity-30"
      />
      <button
        onClick={() => mutation.mutate()}
        disabled={isCheckedIn || mutation.isPending}
        className="bg-brand text-white px-3 py-1.5 font-display font-bold text-[10px] uppercase tracking-widest disabled:opacity-30 hover:brightness-110 transition-all"
      >
        완료처리
      </button>
    </div>
  )
}

export default function AdminPage() {
  const queryClient = useQueryClient()
  const [newChurch, setNewChurch] = useState('')

  const { data: phaseData } = useQuery<{ phase: PhaseCode; label: string }>({
    queryKey: ['phase'],
    queryFn: () => fetch('/api/settings/phase').then((r) => r.json()),
  })

  const activePhase = phaseData?.phase ?? '1A'

  const { data: churches = [] } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: () => fetch('/api/churches').then((r) => r.json()),
  })

  const { data: checkins = [] } = useQuery<Checkin[]>({
    queryKey: ['checkins', activePhase],
    queryFn: () => fetch(`/api/checkins?phase=${activePhase}`).then((r) => r.json()),
    enabled: !!activePhase,
  })

  const phaseMutation = useMutation({
    mutationFn: (phase: PhaseCode) =>
      fetch('/api/settings/phase', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phase'] })
      queryClient.invalidateQueries({ queryKey: ['checkins'] })
    },
  })

  const addChurchMutation = useMutation({
    mutationFn: () =>
      fetch('/api/churches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newChurch }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['churches'] })
      setNewChurch('')
    },
  })

  const checkedInIds = new Set(checkins.map((c) => c.church_id))

  return (
    <div className="min-h-screen bg-muted">

      {/* 헤더 */}
      <header className="px-6 md:px-12 py-6 border-b border-foreground bg-background flex flex-col md:flex-row md:items-end justify-between gap-3">
        <div>
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            운영자 패널
          </p>
          <h1 className="text-3xl font-bold tracking-tight mt-2">관리자</h1>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-display text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
            현재 Phase
          </p>
          <span className="bg-brand text-white px-3 py-1.5 font-display font-bold text-sm tracking-tight">
            {PHASE_LABELS[activePhase]} · {activePhase}
          </span>
        </div>
      </header>

      <main className="px-6 md:px-12 py-8 md:py-12 grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Phase 전환 */}
        <section className="lg:col-span-4 bg-background border border-foreground p-6 md:p-8">
          <div className="flex items-baseline justify-between mb-6">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">Phase 전환</h2>
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
              {checkins.length}/{churches.length} 완료
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {PHASES.map(([code, label]) => (
              <button
                key={code}
                onClick={() => phaseMutation.mutate(code)}
                disabled={phaseMutation.isPending}
                className={`p-4 border text-left transition-colors ${
                  activePhase === code
                    ? 'border-brand bg-brand text-white'
                    : 'border-foreground/20 hover:border-foreground'
                }`}
              >
                <p className="font-display text-lg font-bold tabular-nums">{code}</p>
                <p className={`text-[10px] font-display font-bold tracking-widest uppercase mt-0.5 ${
                  activePhase === code ? 'text-white/80' : 'text-muted-foreground'
                }`}>
                  {label}
                </p>
              </button>
            ))}
          </div>
        </section>

        {/* 교회 추가 */}
        <section className="lg:col-span-4 bg-background border border-foreground p-6 md:p-8">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] mb-6">교회 추가</h2>
          <form
            onSubmit={(e) => { e.preventDefault(); if (newChurch.trim()) addChurchMutation.mutate() }}
            className="space-y-4"
          >
            <div>
              <label className="block text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground mb-2">
                교회명
              </label>
              <input
                type="text"
                value={newChurch}
                onChange={(e) => setNewChurch(e.target.value)}
                placeholder="예: 새벽빛교회"
                className="mt-2 w-full border-2 border-foreground px-3 py-3 outline-none bg-background text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!newChurch.trim() || addChurchMutation.isPending}
              className="w-full py-4 bg-foreground text-background font-display font-bold uppercase tracking-widest text-xs hover:bg-brand transition-colors disabled:opacity-40"
            >
              {addChurchMutation.isPending ? '추가 중...' : '교회 추가'}
            </button>
            {addChurchMutation.isError && (
              <p className="text-xs text-destructive font-bold">이미 등록된 교회명입니다.</p>
            )}
          </form>
        </section>

        {/* 수동 체크인 */}
        <section className="lg:col-span-4 bg-background border border-foreground p-6 md:p-8">
          <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em] mb-6">수동 체크인</h2>
          <div className="flex-1 space-y-2 overflow-y-auto max-h-[400px]">
            {churches.map((church) => (
              <ManualRow
                key={church.id}
                church={church}
                phaseCode={activePhase}
                isCheckedIn={checkedInIds.has(church.id)}
              />
            ))}
          </div>
        </section>

        {/* 전체 교회 테이블 */}
        <section className="lg:col-span-12 bg-background border border-foreground overflow-hidden">
          <div className="px-6 md:px-8 py-5 border-b border-foreground flex justify-between items-center">
            <h2 className="font-display text-xs font-bold uppercase tracking-[0.2em]">전체 교회 현황</h2>
            <span className="text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
              {activePhase} Phase 기준
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-muted/50">
                <tr>
                  {['교회명', '상태', '인원', '체크인 시각'].map((h) => (
                    <th key={h} className="px-6 md:px-8 py-4 text-[10px] font-display font-bold tracking-widest uppercase text-muted-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-foreground/10">
                {churches.map((church) => {
                  const checkin = checkins.find((c) => c.church_id === church.id)
                  return (
                    <tr key={church.id} className="hover:bg-muted/40">
                      <td className="px-6 md:px-8 py-4 font-medium">{church.name}</td>
                      <td className="px-6 md:px-8 py-4">
                        {checkin ? (
                          <span className="text-brand font-display font-bold text-[10px] uppercase tracking-widest">완료</span>
                        ) : (
                          <span className="text-muted-foreground font-display font-bold text-[10px] uppercase tracking-widest">미완료</span>
                        )}
                      </td>
                      <td className="px-6 md:px-8 py-4">
                        {checkin ? `${checkin.total_count}명` : '—'}
                      </td>
                      <td className="px-6 md:px-8 py-4 text-muted-foreground">
                        {checkin
                          ? new Date(checkin.checked_in_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
                          : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  )
}
