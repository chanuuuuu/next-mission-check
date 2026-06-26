import { Search, X } from 'lucide-react'

interface Props {
  query: string
  onChange: (value: string) => void
  onClear: () => void
}

export function SearchInput({ query, onChange, onClear }: Props) {
  return (
    <div className="relative">
      <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-foreground/50 pointer-events-none" />
      <input
        type="text"
        placeholder="교회명 검색 (예: 성덕교회)"
        value={query}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-9 pr-9 h-12 border border-foreground bg-background font-body text-base placeholder:text-foreground/40 focus:outline-none focus:border-foreground"
        style={{ fontSize: '16px' }}
      />
      {query && (
        <button
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/50 hover:text-foreground"
          aria-label="지우기"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
