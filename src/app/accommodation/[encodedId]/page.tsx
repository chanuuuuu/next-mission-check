import { AccommodationClient } from './AccommodationClient'
import { AccommodationBuilding } from '@/types'
import { decodeChurchParam } from '@/lib/encode'
import { CHURCH_NAMES } from '@/lib/churches'

interface Props {
  params: Promise<{ encodedId: string }>
}

export default async function AccommodationPage({ params }: Props) {
  const { encodedId } = await params
  const churchId = decodeChurchParam(encodedId)

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
  const res = await fetch(`${baseUrl}/api/accommodations/${churchId}`, { cache: 'no-store' })
  const buildings: AccommodationBuilding[] = await res.json()

  return <AccommodationClient churchName={churchName} buildings={buildings} />
}
