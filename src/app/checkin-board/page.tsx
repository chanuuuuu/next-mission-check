import { DashboardClient } from './DashboardClient'
import { Church, Checkin } from '@/types'

async function getData() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const [churchesRes, phaseRes] = await Promise.all([
    fetch(`${baseUrl}/api/churches`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/settings/phase`, { cache: 'no-store' }),
  ])

  const churches: Church[] = await churchesRes.json()
  const { phase }: { phase: string } = await phaseRes.json()

  const checkinsRes = await fetch(`${baseUrl}/api/checkins?phase=${phase}`, { cache: 'no-store' })
  const checkins: Checkin[] = await checkinsRes.json()

  return { churches, checkins, phase }
}

export default async function DashboardPage() {
  const { churches, checkins, phase } = await getData()

  return (
    <DashboardClient
      initialChurches={churches}
      initialCheckins={checkins}
      initialPhase={phase}
    />
  )
}
