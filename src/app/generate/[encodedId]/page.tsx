import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import { decodeChurchParam } from '@/lib/encode'
import { Church, Checkin } from '@/types'
import QRPageClient from './QRPageClient'

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
