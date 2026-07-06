import { getAccommodationBuildings } from '@/lib/accommodations'

export const runtime = 'edge'

interface Props {
  params: Promise<{ churchId: string }>
}

export async function GET(request: Request, { params }: Props) {
  const { churchId: churchIdParam } = await params
  const churchId = parseInt(churchIdParam, 10)

  if (isNaN(churchId)) {
    return Response.json({ error: '잘못된 church id 입니다.' }, { status: 400 })
  }

  const { searchParams } = new URL(request.url)
  const numberParam = searchParams.get('number')

  let number: number | undefined
  if (numberParam !== null) {
    number = parseInt(numberParam, 10)
    if (isNaN(number)) {
      return Response.json({ error: '잘못된 번호입니다.' }, { status: 400 })
    }
  }

  const buildings = await getAccommodationBuildings(churchId, number)

  return Response.json(buildings)
}
