import { DashboardClient } from './DashboardClient'
import type { Baseline } from './MobileBoard'
import { Church, Checkin } from '@/types'

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

  return { churches, checkins, phase, baselines }
}

export default async function DashboardPage() {
  const { churches, checkins, phase, baselines } = await getData()

  return (
    <DashboardClient
      initialChurches={churches}
      initialCheckins={checkins}
      initialPhase={phase}
      initialBaselines={baselines}
    />
  )
}
