import { AccommodationClient } from './AccommodationClient'
import { decodeChurchParam, decodeAccommodationNumberParam } from '@/lib/encode'
import { CHURCH_NAMES } from '@/lib/churches'
import { getAccommodationBuildings, getAccommodationByNumber } from '@/lib/accommodations'

interface Props {
  params: Promise<{ encodedId: string }>
}

export default async function AccommodationPage({ params }: Props) {
  const { encodedId } = await params
  const number = decodeAccommodationNumberParam(encodedId)

  if (number !== null) {
    const result = await getAccommodationByNumber(number)

    if (!result) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center px-6">
            <h1 className="text-2xl font-bold">등록되지 않은 번호입니다.</h1>
          </div>
        </div>
      )
    }

    return (
      <AccommodationClient
        churchName={CHURCH_NAMES[result.churchId] ?? ''}
        buildings={result.buildings}
        backHref="/search-accommodation"
        backLabel="번호 다시 입력"
      />
    )
  }

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

  const buildings = await getAccommodationBuildings(churchId)

  return (
    <AccommodationClient
      churchName={churchName}
      buildings={buildings}
      backHref="/accommodation"
      backLabel="교회 다시 선택"
    />
  )
}
