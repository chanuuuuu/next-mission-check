'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { MissionRegistration } from '@/types'
import { DEPARTMENT_MAINS } from '@/config/form-mapping'

type Step = 1 | 2 | 3 | 4

export default function InquiryClient() {
  const [step, setStep] = useState<Step>(1)
  const [departmentMain, setDepartmentMain] = useState<string>('')
  const [subDept1, setSubDept1] = useState<string>('')
  const [subDept2, setSubDept2] = useState<string | null>(null) // null=미선택, ''=IS NULL
  const [nameInput, setNameInput] = useState<string>('')
  const [searchName, setSearchName] = useState<string | null>(null)

  // Step 2: sub_department_1 목록
  const { data: subDept1List = [] } = useQuery<string[]>({
    queryKey: ['inquery-dept1', departmentMain],
    queryFn: () =>
      fetch(`/api/inquery/registrations/departments?department_main=${encodeURIComponent(departmentMain)}`).then((r) => r.json()),
    enabled: !!departmentMain,
  })

  // Step 3: sub_department_2 목록 (빈 배열이면 Step 3 생략)
  const { data: subDept2List = [] } = useQuery<string[]>({
    queryKey: ['inquery-dept2', departmentMain, subDept1],
    queryFn: () =>
      fetch(
        `/api/inquery/registrations/departments?department_main=${encodeURIComponent(departmentMain)}&sub_department_1=${encodeURIComponent(subDept1)}`
      ).then((r) => r.json()),
    enabled: !!departmentMain && !!subDept1,
  })

  const hasSubDept2 = subDept2List.length > 0

  // 결과 조회 — Step 2 완료(sub_dept2 없는 부서) 또는 Step 3 완료 이후
  const readyToSearch =
    !!departmentMain &&
    !!subDept1 &&
    (hasSubDept2 ? subDept2 !== null : true)

  const queryParams = new URLSearchParams({
    department_main: departmentMain,
    sub_department_1: subDept1,
    ...(hasSubDept2 ? { sub_department_2: subDept2 ?? '' } : { sub_department_2: '' }),
    ...(searchName ? { name: searchName } : {}),
  })

  const { data: results = [], isFetching } = useQuery<MissionRegistration[]>({
    queryKey: ['inquery-results', departmentMain, subDept1, subDept2, searchName],
    queryFn: () => fetch(`/api/inquery/registrations?${queryParams}`).then((r) => r.json()),
    enabled: readyToSearch,
  })

  function handleDeptMainSelect(dept: string) {
    setDepartmentMain(dept)
    setSubDept1('')
    setSubDept2(null)
    setSearchName(null)
    setNameInput('')
    setStep(2)
  }

  function handleSubDept1Select(val: string) {
    setSubDept1(val)
    setSubDept2(null)
    setSearchName(null)
    setNameInput('')
    setStep(3)
  }

  function handleSubDept2Select(val: string) {
    setSubDept2(val)
    setSearchName(null)
    setNameInput('')
    setStep(4)
  }

  function handleSearch() {
    setSearchName(nameInput.trim() || null)
  }

  // ── UI (디자인 전달 전 최소 구조) ─────────────────────────────

  return (
    <main>
      {/* Step 1: 대분류 */}
      <section>
        <h2>소속 부서를 선택하세요</h2>
        <div>
          {DEPARTMENT_MAINS.map((dept) => (
            <button
              key={dept}
              onClick={() => handleDeptMainSelect(dept)}
              aria-pressed={departmentMain === dept}
            >
              {dept}
            </button>
          ))}
        </div>
      </section>

      {/* Step 2: sub_department_1 */}
      {step >= 2 && departmentMain && (
        <section>
          <h2>세부 부서를 선택하세요</h2>
          <select
            value={subDept1}
            onChange={(e) => handleSubDept1Select(e.target.value)}
          >
            <option value="">-- 선택 --</option>
            {subDept1List.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </section>
      )}

      {/* Step 3: sub_department_2 (해당 부서에 존재할 때만) */}
      {step >= 3 && subDept1 && hasSubDept2 && (
        <section>
          <h2>세부 구분을 선택하세요</h2>
          <select
            value={subDept2 ?? ''}
            onChange={(e) => handleSubDept2Select(e.target.value)}
          >
            <option value="">-- 선택 --</option>
            {subDept2List.map((v) => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        </section>
      )}

      {/* Step 4: 이름 검색 (선택) */}
      {readyToSearch && (
        <section>
          <h2>이름으로 검색 (선택)</h2>
          <div>
            <input
              type="text"
              placeholder="이름 입력"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch}>검색</button>
            {searchName && (
              <button onClick={() => { setSearchName(null); setNameInput('') }}>초기화</button>
            )}
          </div>
        </section>
      )}

      {/* 결과 리스트 */}
      {readyToSearch && (
        <section>
          {isFetching && <p>조회 중...</p>}
          {!isFetching && results.length === 0 && <p>검색 결과가 없습니다.</p>}
          {results.map((reg) => (
            <RegistrationCard key={reg.id} reg={reg} />
          ))}
        </section>
      )}
    </main>
  )
}

function RegistrationCard({ reg }: { reg: MissionRegistration }) {
  return (
    <article>
      <div>
        <strong>{reg.name}</strong>
        <span>{reg.payment_status ? '납부 완료' : '미납'}</span>
      </div>
      <dl>
        <div>
          <dt>부서</dt>
          <dd>{reg.department_main} / {reg.sub_department_1}{reg.sub_department_2 ? ` / ${reg.sub_department_2}` : ''}</dd>
        </div>
        {reg.small_group && (
          <div><dt>목장</dt><dd>{reg.small_group}</dd></div>
        )}
        {reg.church_name && (
          <div><dt>연계교회</dt><dd>{reg.church_name}</dd></div>
        )}
        {reg.arrival_time && (
          <div><dt>도착 예정</dt><dd>{reg.arrival_time}</dd></div>
        )}
        <div>
          <dt>자차</dt><dd>{reg.use_personal_car === null ? '-' : reg.use_personal_car ? '예' : '아니요'}</dd>
        </div>
        <div>
          <dt>버스</dt><dd>{reg.use_return_bus === null ? '-' : reg.use_return_bus ? '예' : '아니요'}</dd>
        </div>
      </dl>
    </article>
  )
}
