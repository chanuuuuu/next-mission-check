/**
 * 개발용 더미 데이터 시드 스크립트
 * 실행: npx tsx src/lib/seed.ts
 */
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

const CHURCHES = [
  '새벽빛교회', '한사랑교회', '열린문교회', '주님의교회',
  '은혜교회', '소망교회', '기쁨교회', '평화교회',
  '빛과소금교회', '생명수교회',
]

async function seed() {
  console.log('🌱 시드 데이터 삽입 시작...')

  // 교회 마스터 10개 삽입
  for (const name of CHURCHES) {
    await sql`
      INSERT INTO churches (name)
      VALUES (${name})
      ON CONFLICT (name) DO NOTHING
    `
  }
  console.log(`✅ 교회 ${CHURCHES.length}개 삽입 완료`)

  // 1A Phase 샘플 체크인 3건
  const [c1, c2, c3] = await sql`
    SELECT id FROM churches ORDER BY id ASC LIMIT 3
  `

  const sampleCheckins = [
    { church_id: c1.id, is_all_arrived: true, total_count: 12 },
    { church_id: c2.id, is_all_arrived: false, total_count: 8, report_notes: '2명 지각 예정' },
    { church_id: c3.id, is_all_arrived: true, total_count: 15 },
  ]

  for (const c of sampleCheckins) {
    await sql`
      INSERT INTO checkins (church_id, phase_code, is_all_arrived, total_count, report_notes)
      VALUES (${c.church_id}, '1A', ${c.is_all_arrived}, ${c.total_count}, ${c.report_notes ?? null})
      ON CONFLICT (church_id, phase_code) DO NOTHING
    `
  }
  console.log('✅ 1A Phase 샘플 체크인 3건 삽입 완료')

  // active_phase 초기화
  await sql`
    INSERT INTO app_settings (key, value)
    VALUES ('active_phase', '1A')
    ON CONFLICT (key) DO UPDATE SET value = '1A', updated_at = NOW()
  `
  console.log('✅ active_phase = 1A 설정 완료')

  console.log('🎉 시드 완료')
}

seed().catch((err) => {
  console.error('❌ 시드 실패:', err)
  process.exit(1)
})
