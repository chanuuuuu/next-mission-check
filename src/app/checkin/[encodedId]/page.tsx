import { redirect } from 'next/navigation'
import { CheckinForm } from './CheckinForm'
import { Church, Checkin } from '@/types'
import { encodeChurchParam, decodeChurchParam } from '@/lib/encode'

interface Props {
  params: Promise<{ encodedId: string }>
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
  const { encodedId } = await params
  const churchId = decodeChurchParam(encodedId)

  if (!churchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">잘못된 접근입니다.</h1>
          <p className="text-muted-foreground mt-2 text-sm">QR 코드를 다시 스캔해주세요.</p>
        </div>
      </div>
    )
  }

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
    redirect(`/generate/${encodeChurchParam(church.name, church.id)}`)
  }

  return <CheckinForm church={church} phaseCode={phase} />
}
