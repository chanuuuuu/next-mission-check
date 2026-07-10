import { DashboardClient } from './DashboardClient'
import type { Baseline } from './MobileBoard'
import { Church, Checkin } from '@/types'
import { breakfastSourcePhase } from '@/lib/phase'

async function getData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const [churchesRes, phaseRes] = await Promise.all([
    fetch(`${baseUrl}/api/churches`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/settings/phase`, { cache: 'no-store' }),
  ])

  const churches: Church[] = await churchesRes.json()
  const { phase }: { phase: string } = await phaseRes.json()

  const [checkinsRes, baselineRes] = await Promise.all([
    fetch(`${baseUrl}/api/checkins?phase=${phase}`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/teams/baseline?phase=${phase}`, { cache: 'no-store' }),
  ])
  const checkins: Checkin[] = await checkinsRes.json()
  const baselines: Baseline[] = await baselineRes.json()

  // 아침 phase면 직전 저녁(P)의 체크인을 아침 식수 소스로 함께 조회 (초기 flash 방지)
  const sourcePhase = breakfastSourcePhase(phase)
  let sourceCheckins: Checkin[] = []
  if (sourcePhase) {
    const res = await fetch(`${baseUrl}/api/checkins?phase=${sourcePhase}`, {
      cache: 'no-store',
    })
    sourceCheckins = await res.json()
  }

  return { churches, checkins, phase, baselines, sourceCheckins }
}

export default async function DashboardPage() {
  const { churches, checkins, phase, baselines, sourceCheckins } = await getData()

  return (
    <DashboardClient
      initialChurches={churches}
      initialCheckins={checkins}
      initialPhase={phase}
      initialBaselines={baselines}
      initialSourceCheckins={sourceCheckins}
    />
  )
}
