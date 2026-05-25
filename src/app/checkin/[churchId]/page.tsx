import { CheckinForm } from './CheckinForm'
import { Church, Checkin } from '@/types'

interface Props {
  params: Promise<{ churchId: string }>
}

async function getData(churchId: number) {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

  const [churchesRes, phaseRes] = await Promise.all([
    fetch(`${baseUrl}/api/churches`, { cache: 'no-store' }),
    fetch(`${baseUrl}/api/settings/phase`, { cache: 'no-store' }),
  ])

  const churches: Church[] = await churchesRes.json()
  const { phase }: { phase: string } = await phaseRes.json()
  const church = churches.find((c) => c.id === churchId)

  const checkinsRes = await fetch(`${baseUrl}/api/checkins?phase=${phase}`, { cache: 'no-store' })
  const checkins: Checkin[] = await checkinsRes.json()
  const isDuplicate = checkins.some((c) => c.church_id === churchId)

  return { church, phase, isDuplicate }
}

export default async function CheckinPage({ params }: Props) {
  const { churchId: churchIdStr } = await params
  const churchId = Number(churchIdStr)

  const { church, phase, isDuplicate } = await getData(churchId)

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">등록되지 않은 교회입니다.</h1>
          <p className="text-muted-foreground mt-2 text-sm">관리자에게 문의하세요.</p>
        </div>
      </div>
    )
  }

  if (isDuplicate) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6 max-w-sm animate-[var(--animate-slide-up)]">
          <div className="size-16 border-2 border-foreground grid place-items-center mx-auto mb-6">
            <span className="text-2xl">✓</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">이미 체크인 완료</h1>
          <p className="text-muted-foreground mt-3 text-sm">
            <span className="font-bold text-foreground">{church.name}</span>은(는)<br />
            현재 Phase에서 이미 체크인이 완료된 교회입니다.
          </p>
        </div>
      </div>
    )
  }

  return <CheckinForm church={church} phaseCode={phase} />
}
