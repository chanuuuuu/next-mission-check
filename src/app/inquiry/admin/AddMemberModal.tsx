'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DEPARTMENT_MAINS, type DepartmentMain } from '@/config/form-mapping'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function AddMemberModal({ onClose, onSuccess }: Props) {
  const [dept, setDept] = useState<DepartmentMain | ''>('')
  const [subDept1, setSubDept1] = useState('')
  const [subDept2, setSubDept2] = useState('')
  const [smallGroup, setSmallGroup] = useState('')
  const [name, setName] = useState('')
  const [phoneLastFour, setPhoneLastFour] = useState('')
  const [churchName, setChurchName] = useState('')
  const [arrivalTime, setArrivalTime] = useState('')
  const [usePersonalCar, setUsePersonalCar] = useState<boolean | null>(null)
  const [useReturnBus, setUseReturnBus] = useState<boolean | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { data: subDept1List = [] } = useQuery<string[]>({
    queryKey: ['add-dept1', dept],
    queryFn: () =>
      fetch(`/api/inquery/registrations/departments?department_main=${encodeURIComponent(dept)}`).then((r) => r.json()),
    enabled: !!dept,
  })

  const { data: subDept2List = [] } = useQuery<string[]>({
    queryKey: ['add-dept2', dept, subDept1],
    queryFn: () =>
      fetch(`/api/inquery/registrations/departments?department_main=${encodeURIComponent(dept)}&sub_department_1=${encodeURIComponent(subDept1)}`).then((r) => r.json()),
    enabled: !!dept && !!subDept1,
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dept || !subDept1 || !name || !phoneLastFour) {
      setError('필수 항목을 모두 입력해주세요.')
      return
    }
    if (!/^\d{4}$/.test(phoneLastFour)) {
      setError('전화번호 뒤 4자리를 정확히 입력해주세요.')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/inquery/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          department_main: dept,
          sub_department_1: subDept1,
          sub_department_2: subDept2 || null,
          small_group: smallGroup || null,
          name,
          phone_last_four: phoneLastFour,
          church_name: churchName || null,
          arrival_time: arrivalTime || null,
          use_personal_car: usePersonalCar,
          use_return_bus: useReturnBus,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error: string }
        setError(data.error ?? '추가 실패')
        return
      }

      onSuccess()
    } catch {
      setError('서버 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  // ── UI (디자인 전달 전 최소 구조) ─────────────────────────────

  return (
    <dialog open>
      <h2>대원 수동 추가</h2>
      <form onSubmit={handleSubmit}>

        <label>
          부서 *
          <select value={dept} onChange={(e) => { setDept(e.target.value as DepartmentMain); setSubDept1(''); setSubDept2('') }}>
            <option value="">-- 선택 --</option>
            {DEPARTMENT_MAINS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>

        {subDept1List.length > 0 && (
          <label>
            세부 부서 1 *
            <select value={subDept1} onChange={(e) => { setSubDept1(e.target.value); setSubDept2('') }}>
              <option value="">-- 선택 --</option>
              {subDept1List.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}

        {subDept2List.length > 0 && (
          <label>
            세부 부서 2
            <select value={subDept2} onChange={(e) => setSubDept2(e.target.value)}>
              <option value="">-- 선택 --</option>
              {subDept2List.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          </label>
        )}

        <label>
          이름 *
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </label>

        <label>
          전화번호 뒤 4자리 *
          <input
            value={phoneLastFour}
            onChange={(e) => setPhoneLastFour(e.target.value.slice(0, 4))}
            inputMode="numeric"
            maxLength={4}
          />
        </label>

        {dept === '2청' && (
          <label>
            연계교회
            <input value={churchName} onChange={(e) => setChurchName(e.target.value)} />
          </label>
        )}

        {dept === '청장년' && (
          <label>
            소속 목장
            <input value={smallGroup} onChange={(e) => setSmallGroup(e.target.value)} />
          </label>
        )}

        <label>
          도착 예상 시간
          <input value={arrivalTime} onChange={(e) => setArrivalTime(e.target.value)} />
        </label>

        <fieldset>
          <legend>자차 이용</legend>
          <label><input type="radio" name="car" onChange={() => setUsePersonalCar(true)} checked={usePersonalCar === true} /> 예</label>
          <label><input type="radio" name="car" onChange={() => setUsePersonalCar(false)} checked={usePersonalCar === false} /> 아니요</label>
        </fieldset>

        <fieldset>
          <legend>교회 버스 탑승</legend>
          <label><input type="radio" name="bus" onChange={() => setUseReturnBus(true)} checked={useReturnBus === true} /> 예</label>
          <label><input type="radio" name="bus" onChange={() => setUseReturnBus(false)} checked={useReturnBus === false} /> 아니요</label>
        </fieldset>

        {error && <p role="alert">{error}</p>}

        <div>
          <button type="button" onClick={onClose}>취소</button>
          <button type="submit" disabled={loading}>{loading ? '추가 중...' : '추가'}</button>
        </div>
      </form>
    </dialog>
  )
}
