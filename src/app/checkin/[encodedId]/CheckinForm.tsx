'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { Church } from '@/types'
import { encodeChurchParam } from '@/lib/encode'

interface Props {
  church: Church
  phaseCode: string
}

export function CheckinForm({ church, phaseCode }: Props) {
  const router = useRouter()
  const [allArrived, setAllArrived] = useState(false)
  const [headcount, setHeadcount] = useState('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [countdown, setCountdown] = useState(3)

  const isMorning = phaseCode.endsWith('A')
  const greeting = isMorning
    ? `${church.name} 선교대원 여러분,\n오늘도 은혜로운 선교가 되기를 소망합니다.`
    : `${church.name} 선교대원 여러분,\n오늘도 너무 고생하셨습니다.`

  const canSubmit = allArrived && Number(headcount) >= 1

  const mutation = useMutation({
    mutationFn: () =>
      fetch('/api/checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          church_id: church.id,
          phase_code: phaseCode,
          is_all_arrived: allArrived,
          total_count: Number(headcount),
          report_notes: note || null,
        }),
      }).then(async (r) => {
        if (!r.ok) throw await r.json()
        return r.json()
      }),
    onSuccess: () => setSubmitted(true),
  })

  useEffect(() => {
    if (!submitted) return
    if (countdown === 0) {
      router.push(`/generate/${encodeChurchParam(church.name, church.id)}`)
      return
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000)
    return () => clearTimeout(timer)
  }, [submitted, countdown, church.name, church.id, router])

  if (submitted) {
    return (
      <div className="h-screen bg-background flex justify-center overflow-hidden">
        <div className="w-full max-w-[480px] h-full flex flex-col items-center justify-center px-8 text-center animate-[var(--animate-slide-up)]">
          <div className="size-14 border-2 border-brand grid place-items-center mb-5">
            <span className="text-xl text-brand">✓</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">체크인 완료!</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            <span className="font-bold text-foreground">{church.name}</span>의 도착이 확인되었습니다.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            총 <span className="font-bold text-brand text-lg">{headcount || 0}</span>명 도착
          </p>
          <p className="mt-6 text-sm text-muted-foreground">
            <span className="font-bold text-foreground tabular-nums">{countdown}</span>초 후 QR 페이지로 이동합니다.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen bg-background flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">

        {/* 인사말 헤더 */}
        <header className="p-8 bg-foreground text-background flex-shrink-0">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase opacity-60">
            셀프 체크인 · STEP 3
          </p>
          <h1 className="text-xl font-bold tracking-tight mt-3 leading-snug whitespace-pre-line">
            {greeting}
          </h1>
        </header>

        {/* 폼 */}
        <form
          onSubmit={(e) => { e.preventDefault(); mutation.mutate() }}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 py-8 space-y-8 flex-1 overflow-y-auto">

            {/* 모든 인원 도착 여부 */}
            <div>
              <label className="block font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                모든 인원 도착 여부
              </label>
              <button
                type="button"
                onClick={() => setAllArrived(!allArrived)}
                className={`w-full flex items-center justify-between p-4 border-2 transition-colors text-left ${
                  allArrived
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-foreground/20'
                }`}
              >
                <span className="font-medium text-base">모든 인원이 도착이 완료되었나요?</span>
                <span className={`size-6 border-2 grid place-items-center font-bold text-sm flex-shrink-0 ${
                  allArrived
                    ? 'border-brand bg-brand text-white'
                    : 'border-foreground/30'
                }`}>
                  {allArrived ? '✓' : ''}
                </span>
              </button>
            </div>

            {/* 현재 인원 수 */}
            <div>
              <label className="block font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                현재 인원 수
              </label>
              <input
                type="number"
                inputMode="numeric"
                value={headcount}
                onChange={(e) => setHeadcount(e.target.value.replace(/\D/g, ''))}
                placeholder="0"
                className="w-full border-b-2 border-foreground py-2 text-3xl font-display font-bold outline-none bg-transparent placeholder:text-muted-foreground/40"
              />
              <p className="text-xs text-muted-foreground mt-1">숫자만 입력</p>
            </div>

            {/* 추가 보고 사항 */}
            <div>
              <label className="block font-display text-sm font-bold uppercase tracking-[0.2em] text-muted-foreground mb-2">
                추가 보고 사항
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="추가적으로 보고가 필요한 사항이 있나요?"
                rows={3}
                className="w-full border border-foreground/20 focus:border-foreground p-3 outline-none resize-none text-sm bg-transparent transition-colors"
              />
            </div>
          </div>

          {/* 완료 버튼 */}
          <div className="px-6 py-4 border-t border-foreground bg-background flex-shrink-0">
            {mutation.isError && (
              <p className="text-sm text-destructive mb-2 text-center font-bold">
                오류가 발생했습니다. 다시 시도해주세요.
              </p>
            )}
            {!canSubmit && !mutation.isError && (
              <p className="text-xs text-muted-foreground mb-2 text-center">
                {!allArrived ? '모든 인원 도착 여부를 확인해주세요.' : '인원 수를 입력해주세요.'}
              </p>
            )}
            <button
              type="submit"
              disabled={!canSubmit || mutation.isPending}
              className="w-full bg-brand text-white py-3 font-display font-bold uppercase tracking-widest text-sm hover:brightness-110 transition-all disabled:opacity-40"
            >
              {mutation.isPending ? '처리 중...' : '완료'}
            </button>
          </div>
        </form>

      </div>
    </div>
  )
}
