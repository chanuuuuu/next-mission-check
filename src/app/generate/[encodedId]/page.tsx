import { QRPageClient } from './QRPageClient'
import { Church } from '@/types'
import { decodeChurchParam } from '@/lib/encode'

interface Props {
  params: Promise<{ encodedId: string }>
}

export default async function GenerateEncodedPage({ params }: Props) {
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

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
  const res = await fetch(`${baseUrl}/api/churches`, { cache: 'no-store' })
  const churches: Church[] = await res.json()
  const church = churches.find((c) => c.id === churchId)

  if (!church) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center px-6">
          <h1 className="text-2xl font-bold">등록되지 않은 교회입니다.</h1>
        </div>
      </div>
    )
  }

  return <QRPageClient church={church} />
}
