'use client'

import { Search } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

export interface FilterState {
  main: string
  sub1: string
  sub2: string
  name: string
}

interface Props {
  value: FilterState
  onChange: (next: FilterState) => void
  onSubmit: () => void
}

export function RegistrationFilters({ value, onChange, onSubmit }: Props) {
  const { data: sub1Opts = [] } = useQuery<string[]>({
    queryKey: ['filter-dept1', value.main],
    queryFn: () =>
      fetch(`/api/inquery/registrations/departments?department_main=${encodeURIComponent(value.main)}`).then((r) =>
        r.json()
      ),
    enabled: !!value.main,
  })

  const { data: sub2Opts = [] } = useQuery<string[]>({
    queryKey: ['filter-dept2', value.main, value.sub1],
    queryFn: () =>
      fetch(
        `/api/inquery/registrations/departments?department_main=${encodeURIComponent(value.main)}&sub_department_1=${encodeURIComponent(value.sub1)}`
      ).then((r) => r.json()),
    enabled: !!value.main && !!value.sub1,
  })

  // 기타부서처럼 sub2가 없으면 컬럼 숨김 (API가 빈 배열 반환)
  const hideSub2 = sub2Opts.length === 0

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit()
      }}
      className="bg-background border border-foreground p-5 md:p-6 grid grid-cols-1 md:grid-cols-12 gap-3"
    >
      <SelectField
        label="본부서"
        value={value.main}
        onChange={(v) => onChange({ main: v, sub1: '', sub2: '', name: value.name })}
        options={['2청', '기타부서', '청장년']}
        className="md:col-span-3"
      />
      <SelectField
        label="소속 1"
        value={value.sub1}
        onChange={(v) => onChange({ ...value, sub1: v, sub2: '' })}
        options={sub1Opts}
        disabled={!value.main}
        className="md:col-span-3"
      />
      {!hideSub2 && (
        <SelectField
          label="소속 2"
          value={value.sub2}
          onChange={(v) => onChange({ ...value, sub2: v })}
          options={sub2Opts}
          disabled={!value.sub1}
          className="md:col-span-2"
        />
      )}
      <label className={`block ${hideSub2 ? 'md:col-span-5' : 'md:col-span-3'}`}>
        <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
          이름
        </span>
        <input
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="이름을 입력하세요"
          className="mt-2 w-full border-2 border-foreground px-3 py-2.5 outline-none bg-background text-sm"
        />
      </label>
      <button
        type="submit"
        className="md:col-span-1 mt-2 md:mt-[26px] inline-flex items-center justify-center gap-2 bg-foreground text-background font-display font-bold uppercase tracking-widest text-xs px-4 py-2.5 hover:bg-brand transition-colors"
      >
        <Search size={14} />
        조회
      </button>
    </form>
  )
}

function SelectField({
  label,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: string[]
  disabled?: boolean
  className?: string
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="mt-2 w-full border-2 border-foreground px-3 py-2.5 outline-none bg-background text-sm disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
      >
        <option value="">전체</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
