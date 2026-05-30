import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { sql } from '@/lib/db'
import { FORM_MAPPINGS, parseBooleanField } from '@/config/form-mapping'
import { sendSyncErrorAlert } from '@/lib/discord'

const SHEET_IDS: Record<string, string | undefined> = {
  '2청': process.env.GOOGLE_SHEET_ID_2CHUNG,
  기타부서: process.env.GOOGLE_SHEET_ID_ETC,
  청장년: process.env.GOOGLE_SHEET_ID_ADULT,
}

const SYNC_STATUS_COLUMN = '동기화 상태'

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      type: 'service_account',
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })
}

// 컬럼 인덱스(0-based) → A1 notation 컬럼 문자 (A, B, ..., Z, AA, AB, ...)
function colIndexToLetter(idx: number): string {
  let letter = ''
  let n = idx + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    letter = String.fromCharCode(65 + rem) + letter
    n = Math.floor((n - 1) / 26)
  }
  return letter
}

// 스프레드시트의 첫 번째 시트 이름을 동적으로 조회
async function getFirstSheetTitle(
  sheets: ReturnType<typeof google.sheets>,
  spreadsheetId: string
): Promise<string> {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })
  const title = meta.data.sheets?.[0]?.properties?.title
  if (!title) throw new Error('시트 이름 조회 실패')
  return title
}

// POST /api/inquery/sync/manual — 관리자 수동 강제 동기화
export async function POST(req: NextRequest) {
  const cookie = req.cookies.get('inquery_admin_session')
  if (!cookie || cookie.value !== 'authenticated') {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const auth = getAuth()
  const sheets = google.sheets({ version: 'v4', auth })

  let synced = 0
  let failed = 0

  for (const [department, sheetId] of Object.entries(SHEET_IDS)) {
    if (!sheetId) continue
    const mapping = FORM_MAPPINGS[department as keyof typeof FORM_MAPPINGS]
    if (!mapping) continue

    let rows: string[][]
    let headers: string[]
    let sheetTitle: string
    try {
      sheetTitle = await getFirstSheetTitle(sheets, sheetId)
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId: sheetId,
        range: sheetTitle,
      })
      const values = res.data.values ?? []
      if (values.length < 2) continue
      headers = values[0] as string[]
      rows = values.slice(1) as string[][]
    } catch {
      await sendSyncErrorAlert({ department, reason: 'Google Sheets 조회 실패' })
      failed++
      continue
    }

    const statusColIdx = headers.indexOf(SYNC_STATUS_COLUMN)
    const successRowIndices: number[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      // 완전히 빈 행 스킵 (폼 응답 삭제 후 남는 빈 행 방어)
      if (!row.some((cell) => cell?.trim())) continue

      const namedValues: Record<string, string[]> = {}
      headers.forEach((h, idx) => {
        namedValues[h] = [row[idx] ?? '']
      })

      const findByKeyword = (keyword: string | null) => {
        if (!keyword) return undefined
        const key = Object.keys(namedValues).find((k) => k.includes(keyword))
        return key ? namedValues[key][0]?.trim() : undefined
      }

      const subDept1 = findByKeyword(mapping.sub_department_1)
      const subDept2 = findByKeyword(mapping.sub_department_2) ?? null
      const smallGroup = findByKeyword(mapping.small_group) ?? null
      const name = findByKeyword(mapping.name)
      const phoneRaw = findByKeyword(mapping.phone_last_four)
      const churchName = findByKeyword(mapping.church_name) ?? null
      const arrivalTime = findByKeyword(mapping.arrival_time) ?? null
      const usePersonalCar = parseBooleanField(findByKeyword(mapping.use_personal_car))
      const useReturnBus = parseBooleanField(findByKeyword(mapping.use_return_bus))

      if (!subDept1 || !name || !phoneRaw) {
        await sendSyncErrorAlert({ department, name, reason: '수동 동기화 중 필수 필드 누락' })
        failed++
        continue
      }

      const phoneFour = String(phoneRaw).slice(-4)

      try {
        await sql`
          INSERT INTO mission_registrations
            (department_main, sub_department_1, sub_department_2, small_group,
             name, phone_last_four, church_name, arrival_time, use_personal_car, use_return_bus)
          VALUES
            (${department}, ${subDept1}, ${subDept2}, ${smallGroup},
             ${name}, ${phoneFour}, ${churchName}, ${arrivalTime}, ${usePersonalCar}, ${useReturnBus})
          ON CONFLICT ON CONSTRAINT uq_registration DO UPDATE SET
            department_main  = EXCLUDED.department_main,
            small_group      = EXCLUDED.small_group,
            church_name      = EXCLUDED.church_name,
            arrival_time     = EXCLUDED.arrival_time,
            use_personal_car = EXCLUDED.use_personal_car,
            use_return_bus   = EXCLUDED.use_return_bus,
            updated_at       = NOW()
        `
        synced++
        successRowIndices.push(i + 2) // 1-indexed + 헤더 행 offset
      } catch {
        await sendSyncErrorAlert({ department, name, reason: 'DB Upsert 실패' })
        failed++
      }
    }

    // SUCCESS 마킹 — 시트에 [동기화 상태] 컬럼 Write back
    if (statusColIdx >= 0 && successRowIndices.length > 0) {
      const colLetter = colIndexToLetter(statusColIdx)
      const data = successRowIndices.map((rowNum) => ({
        range: `${sheetTitle}!${colLetter}${rowNum}`,
        values: [['SUCCESS']],
      }))
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { valueInputOption: 'RAW', data },
      }).catch(() => {})
    }
  }

  return NextResponse.json({ synced, failed })
}
