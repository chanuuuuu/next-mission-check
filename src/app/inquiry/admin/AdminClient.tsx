'use client'

import { useState, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { MissionRegistration } from '@/types'
import { DEPARTMENT_MAINS, type DepartmentMain } from '@/config/form-mapping'
import AddMemberModal from './AddMemberModal'

interface Props {
  initialData: MissionRegistration[]
  initialDept: DepartmentMain
}

export default function AdminClient({ initialData, initialDept }: Props) {
  const queryClient = useQueryClient()
  const [activeDept, setActiveDept] = useState<DepartmentMain>(initialDept)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [syncMsg, setSyncMsg] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)

  // debounce 검색
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    const timer = setTimeout(() => setDebouncedSearch(value), 300)
    return () => clearTimeout(timer)
  }, [])

  const queryKey = ['inquery-admin', activeDept, debouncedSearch]

  const { data: members = initialData, isFetching } = useQuery<MissionRegistration[]>({
    queryKey,
    queryFn: () => {
      const params = new URLSearchParams({ department_main: activeDept })
      if (debouncedSearch) params.set('name', debouncedSearch)
      return fetch(`/api/inquery/registrations?${params}`).then((r) => r.json())
    },
    initialData: activeDept === initialDept && !debouncedSearch ? initialData : undefined,
  })

  // 납부 상태 토글 (낙관적 업데이트)
  const togglePayment = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/inquery/registrations/${id}/payment`, { method: 'PATCH' }).then((r) => r.json()),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey })
      const prev = queryClient.getQueryData<MissionRegistration[]>(queryKey)
      queryClient.setQueryData<MissionRegistration[]>(queryKey, (old) =>
        old?.map((m) => m.id === id ? { ...m, payment_status: !m.payment_status } : m)
      )
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(queryKey, ctx.prev)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey }),
  })

  async function handleSync() {
    setIsSyncing(true)
    setSyncMsg(null)
    try {
      const res = await fetch('/api/inquery/sync/manual', { method: 'POST' })
      const data = await res.json() as { synced: number; failed: number }
      setSyncMsg(`동기화 완료 — 성공 ${data.synced}건 / 실패 ${data.failed}건`)
      queryClient.invalidateQueries({ queryKey })
    } catch {
      setSyncMsg('동기화 중 오류가 발생했습니다.')
    } finally {
      setIsSyncing(false)
    }
  }

  async function handleLogout() {
    await fetch('/api/inquery/auth', { method: 'DELETE' })
    window.location.href = '/inquiry/admin/login'
  }

  // ── UI (디자인 전달 전 최소 구조) ─────────────────────────────

  return (
    <main>
      {/* 헤더 */}
      <header>
        <h1>선교 등록 관리</h1>
        <div>
          <button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? '동기화 중...' : '동기화'}
          </button>
          <button onClick={() => setShowAddModal(true)}>대원 추가</button>
          <button onClick={handleLogout}>로그아웃</button>
        </div>
      </header>

      {syncMsg && <p role="status">{syncMsg}</p>}

      {/* 부서 탭 */}
      <nav>
        {DEPARTMENT_MAINS.map((dept) => (
          <button
            key={dept}
            onClick={() => { setActiveDept(dept); setSearch(''); setDebouncedSearch('') }}
            aria-pressed={activeDept === dept}
          >
            {dept}
          </button>
        ))}
      </nav>

      {/* 이름 검색 */}
      <div>
        <input
          type="text"
          placeholder="이름 검색"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />
      </div>

      {/* 대원 리스트 */}
      {isFetching && <p>불러오는 중...</p>}
      {!isFetching && members.length === 0 && <p>해당 조건의 대원이 없습니다.</p>}

      <table>
        <thead>
          <tr>
            <th>이름</th>
            <th>세부 부서</th>
            <th>연계교회 / 목장</th>
            <th>도착 예정</th>
            <th>자차</th>
            <th>버스</th>
            <th>납부</th>
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td>
                {m.sub_department_1}
                {m.sub_department_2 ? ` / ${m.sub_department_2}` : ''}
              </td>
              <td>{m.church_name ?? m.small_group ?? '-'}</td>
              <td>{m.arrival_time ?? '-'}</td>
              <td>{m.use_personal_car === null ? '-' : m.use_personal_car ? '예' : '아니요'}</td>
              <td>{m.use_return_bus === null ? '-' : m.use_return_bus ? '예' : '아니요'}</td>
              <td>
                <button
                  onClick={() => togglePayment.mutate(m.id)}
                  disabled={togglePayment.isPending}
                  aria-label={m.payment_status ? '납부 완료 (클릭하여 취소)' : '미납 (클릭하여 납부 처리)'}
                >
                  {m.payment_status ? '납부 완료' : '미납'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <AddMemberModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false)
            queryClient.invalidateQueries({ queryKey })
          }}
        />
      )}
    </main>
  )
}
