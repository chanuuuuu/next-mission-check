import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { sql } from '@/lib/db'
import type { MissionRegistration } from '@/types'
import AdminClient from './AdminClient'

export default async function InquiryAdminPage() {
  const cookieStore = await cookies()
  const session = cookieStore.get('inquery_admin_session')
  if (!session || session.value !== 'authenticated') {
    redirect('/inquiry/admin/login')
  }

  // 초기 데이터: 2청 전체 (기본 탭)
  const initial = (await sql`
    SELECT * FROM mission_registrations
    WHERE department_main = '2청'
    ORDER BY sub_department_1, sub_department_2, name
  `) as MissionRegistration[]

  return <AdminClient initialData={initial} />
}
