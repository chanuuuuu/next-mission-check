'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!pin) return
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/inquery/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (res.ok) {
        router.replace('/inquiry/admin')
      } else {
        setError('PIN이 올바르지 않습니다.')
        setPin('')
      }
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-12">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-background border border-foreground p-8"
      >
        <div className="flex items-center gap-2 text-brand mb-1">
          <Lock size={14} />
          <span className="font-display text-[10px] font-bold tracking-[0.25em] uppercase">
            Admin Only
          </span>
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight">관리자 로그인</h1>
        <p className="text-xs text-muted-foreground mt-2 mb-6">
          관리자 PIN 코드를 입력하세요.
        </p>
        <label className="block">
          <span className="text-[10px] font-display font-bold uppercase tracking-widest text-muted-foreground">
            PIN
          </span>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => {
              setPin(e.target.value)
              setError('')
            }}
            placeholder="••••"
            autoFocus
            className="mt-2 w-full border-2 border-foreground px-3 py-3 outline-none bg-background tracking-widest"
          />
        </label>
        {error && (
          <p className="mt-3 text-xs text-brand font-display font-bold uppercase tracking-widest">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !pin}
          className="mt-6 w-full py-3.5 bg-foreground text-background font-display font-bold uppercase tracking-widest text-xs hover:bg-brand transition-colors disabled:opacity-60"
        >
          {loading ? '확인 중…' : '관리자 로그인'}
        </button>
      </form>
    </div>
  )
}
