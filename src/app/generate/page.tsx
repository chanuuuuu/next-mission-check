'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { Church } from '@/types'
import { encodeChurchParam } from '@/lib/encode'

export default function GeneratePage() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<number | null>(null)

  const { data: churches = [], isLoading } = useQuery<Church[]>({
    queryKey: ['churches'],
    queryFn: () => fetch('/api/churches').then((r) => r.json()),
  })

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.trim().toLowerCase()
    return churches.filter((c) => c.name.toLowerCase().includes(q))
  }, [churches, query])

  const selectedChurch = churches.find((c) => c.id === selected)

  const handleNext = () => {
    if (!selectedChurch) return
    router.push(`/generate/${encodeChurchParam(selectedChurch.name, selectedChurch.id)}`)
  }

  return (
    <div className="h-screen bg-muted flex justify-center overflow-hidden">
      <div className="w-full max-w-[480px] bg-background border-x border-foreground h-full flex flex-col animate-[var(--animate-slide-up)]">

        {/* 헤더 */}
        <header className="px-6 pt-8 pb-6 border-b border-foreground flex-shrink-0">
          <p className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground">
            셀프 체크인 · STEP 1
          </p>
          <h1 className="text-xl font-bold tracking-tight mt-2 leading-none">
            교회 선택
          </h1>
          <p className="text-sm text-muted-foreground mt-3">
            소속 교회를 검색하여 선택하세요.
          </p>
        </header>

        {/* 검색 */}
        <div className="px-6 pt-4 pb-2 flex-shrink-0">
          <div className="flex items-center border-2 border-foreground">
            <span className="px-3 font-display text-sm font-bold text-muted-foreground">
              검색
            </span>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelected(null) }}
              placeholder="교회명 입력..."
              className="flex-1 py-3 pr-3 outline-none text-base bg-transparent placeholder:text-muted-foreground"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setSelected(null) }}
                className="px-3 text-xs font-bold text-muted-foreground hover:text-foreground"
              >
                지우기
              </button>
            )}
          </div>
        </div>

        {/* 교회 목록 */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {isLoading ? (
            <p className="text-center py-16 text-sm text-muted-foreground">불러오는 중...</p>
          ) : !query.trim() ? (
            <p className="text-center py-16 text-sm text-muted-foreground">
              교회명을 검색하면 목록이 표시됩니다.
            </p>
          ) : results.length === 0 ? (
            <p className="text-center py-16 text-sm text-muted-foreground">
              검색된 교회가 없습니다.
            </p>
          ) : (
            results.map((church) => (
              <button
                key={church.id}
                onClick={() => setSelected(church.id)}
                className={`w-full flex items-center justify-between p-4 border transition-colors text-left ${
                  selected === church.id
                    ? 'border-brand bg-brand/5 text-brand'
                    : 'border-foreground/15 hover:border-foreground'
                }`}
              >
                <span className="font-medium">{church.name}</span>
                {selected === church.id && (
                  <span className="text-[10px] font-display font-bold uppercase tracking-widest text-brand">
                    선택됨
                  </span>
                )}
              </button>
            ))
          )}
        </div>

        {/* 하단 */}
        <div className="px-6 py-6 border-t border-foreground bg-background flex-shrink-0">
          {selectedChurch && (
            <div className="mb-3 flex justify-between items-center text-sm font-bold">
              <span className="text-muted-foreground">선택된 교회</span>
              <span>{selectedChurch.name}</span>
            </div>
          )}
          <button
            disabled={selected === null}
            onClick={handleNext}
            className="w-full bg-brand text-white py-4 font-display font-bold uppercase tracking-widest text-sm disabled:bg-muted disabled:text-muted-foreground transition-colors"
          >
            다음 — QR 생성
          </button>
        </div>

      </div>
    </div>
  )
}
