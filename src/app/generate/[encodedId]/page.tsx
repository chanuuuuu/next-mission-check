import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { sql } from '@/lib/db'
import { decodeChurchParam } from '@/lib/encode'
import { Church, Checkin } from '@/types'
import QRPageClient from './QRPageClient'

export async function generateMetadata({ params }: { params: Promise<{ encodedId: string }> }): Promise<Metadata> {
  const { encodedId } = await params
  const churchId = decodeChurchParam(encodedId)
  if (!churchId) return {}

  const [church] = (await sql`SELECT name FROM churches WHERE id = ${churchId}`) as Church[]
  if (!church) return {}

  return {
    title: `${church.name} QR 체크인`,
    openGraph: {
      title: `${church.name} QR 체크인`,
      description: '미션 체크인 QR 코드입니다. 링크를 열어 QR을 확인하세요.',
      images: [{ url: '/logo.png', width: 1200, height: 630 }],
    },
  }
}

export default async function QRPage({ params }: { params: Promise<{ encodedId: string }> }) {
  const { encodedId } = await params

  const churchId = decodeChurchParam(encodedId)
  if (!churchId) redirect('/generate')

  const [[church], [settings]] = await Promise.all([
    sql`SELECT * FROM churches WHERE id = ${churchId}`,
    sql`SELECT value FROM app_settings WHERE key = 'active_phase'`,
  ]) as [Church[], { value: string }[]]
  if (!church) redirect('/generate')

  const phase = (settings?.value ?? '') as string

  let isCheckedIn = false
  if (phase) {
    const [checkin] = (await sql`
      SELECT id FROM checkins WHERE church_id = ${churchId} AND phase_code = ${phase}
    `) as Checkin[]
    isCheckedIn = !!checkin
  }

  return <QRPageClient church={church} phase={phase} initialIsCheckedIn={isCheckedIn} />
}
