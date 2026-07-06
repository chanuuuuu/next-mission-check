import { AccommodationClient } from './AccommodationClient'
import { AccommodationBuilding } from '@/types'
import { decodeChurchParam, decodeAccommodationLookupParam } from '@/lib/encode'
import { CHURCH_NAMES } from '@/lib/churches'

interface Props {
  params: Promise<{ encodedId: string }>
}

export default async function AccommodationPage({ params }: Props) {
  const { encodedId } = await params
  const lookup = decodeAccommodationLookupParam(encodedId)
  const churchId = lookup?.churchId ?? decodeChurchParam(encodedId)

  if (!churchId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">잘못된 접근입니다.</h1>
        </div>
      </div>
    )
  }

  const churchName = CHURCH_NAMES[churchId]

  if (!churchName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">등록되지 않은 교회입니다.</h1>
        </div>
      </div>
    )
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const qs = lookup ? `?number=${lookup.number}` : ''
  const res = await fetch(`${baseUrl}/api/accommodations/${churchId}${qs}`, { cache: 'no-store' })
  const buildings: AccommodationBuilding[] = await res.json()

  const backHref = lookup ? '/search-accommodation' : '/accommodation'
  const backLabel = lookup ? '번호 다시 입력' : '교회 다시 선택'

  return (
    <AccommodationClient
      churchName={churchName}
      buildings={buildings}
      backHref={backHref}
      backLabel={backLabel}
    />
  )
}
