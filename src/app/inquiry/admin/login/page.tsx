'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLoginPage() {
  const router = useRouter()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

  // ── UI (디자인 전달 전 최소 구조) ─────────────────────────────

  return (
    <main>
      <h1>관리자 로그인</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN 입력"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />
        {error && <p role="alert">{error}</p>}
        <button type="submit" disabled={loading || !pin}>
          {loading ? '확인 중...' : '확인'}
        </button>
      </form>
    </main>
  )
}
