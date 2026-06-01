/**
 * GAS 웹훅 스크립트 템플릿
 * 사용 방법:
 *  1. 구글 폼과 연결된 응답 스프레드시트 > 확장 프로그램 > Apps Script
 *  2. 이 코드를 Code.gs에 붙여넣고 WEBHOOK_URL과 DEPARTMENT를 수정
 *  3. 좌측 시계 아이콘(트리거) > 트리거 추가
 *     - 함수: onFormSubmit
 *     - 이벤트 소스: 스프레드시트에서
 *     - 이벤트 유형: 양식 제출 시
 */

const SYNC_STATUS_COLUMN = '동기화 상태'
const MAX_RETRIES = 3

// 웹훅으로 전송할 컬럼 키워드 화이트리스트 (form-mapping.ts 기준)
// 매칭되지 않는 컬럼(주민등록번호, 주소 등)은 전송하지 않음
const ALLOWED_KEYWORDS = [
  '소속부서(진)',       // 2청 sub1
  '소속부서(팀)',       // 2청 sub2
  '소속부서',           // 기타부서 sub1
  '세부소속(진)',       // 청장년 sub1
  '연계교회 이름',      // 2청 church_name, 청장년 sub2
  '소속 목장 이름',     // 청장년 small_group
  '등록자 이름',        // name
  '핸드폰 번호',        // phone_last_four
  '참여 일정 및 이동수단 조사',  // schedule_survey
  '연계교회 도착 예상시간',      // arrival_time
  '자차를 가져 오시나요',        // use_personal_car
  '선교 기간 중 자차를 이용하시나요', // use_car_during_mission
  '교회 버스에 탑승하시나요',    // use_return_bus
]

function onFormSubmit(e) {
  const namedValues = e.namedValues
  const webhookUrl = PropertiesService.getScriptProperties().getProperty('WEBHOOK_URL')
  const department = PropertiesService.getScriptProperties().getProperty('DEPARTMENT')
  if (!webhookUrl || !department) {
    Logger.log('WEBHOOK_URL 또는 DEPARTMENT가 Script Properties에 설정되지 않았습니다.')
    return
  }

  const filteredValues = Object.fromEntries(
    Object.entries(namedValues).filter(([key]) =>
      ALLOWED_KEYWORDS.some(kw => key.includes(kw))
    )
  )

  const payload = JSON.stringify({
    department: department,
    namedValues: filteredValues,
  })

  let success = false
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(webhookUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: payload,
        muteHttpExceptions: true,
      })

      if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
        success = true
        markSyncStatus(e, 'SUCCESS')
        break
      }
    } catch (err) {
      Logger.log(`시도 ${attempt} 실패: ${err}`)
    }

    if (attempt < MAX_RETRIES) {
      Utilities.sleep(Math.pow(2, attempt) * 1000) // 지수 백오프: 2s, 4s
    }
  }

  if (!success) {
    // 시트에 FAIL 마킹
    markSyncStatus(e, 'FAIL')

    // Discord 직접 알림 (DISCORD_WEBHOOK_URL을 스크립트 속성에 저장)
    const discordUrl = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK_URL')
    if (discordUrl) {
      const nameKey = Object.keys(namedValues).find(k => k.includes('이름'))
      const name = nameKey ? namedValues[nameKey][0] : '(이름 없음)'
      UrlFetchApp.fetch(discordUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          username: '선교 등록 시스템',
          embeds: [{
            title: `⚠️ 동기화 실패 — ${department}`,
            color: 16711748,
            fields: [
              { name: '대상', value: name, inline: true },
              { name: '발생 시각', value: new Date().toISOString(), inline: true },
              { name: '오류 원인', value: '웹훅 3회 재시도 실패', inline: false },
            ],
          }],
        }),
        muteHttpExceptions: true,
      })
    }
  }
}

function markSyncStatus(e, status) {
  try {
    const sheet = e.source.getActiveSheet()
    const lastRow = sheet.getLastRow()
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    const statusColIdx = headers.indexOf(SYNC_STATUS_COLUMN)
    if (statusColIdx >= 0) {
      sheet.getRange(lastRow, statusColIdx + 1).setValue(status)
    }
  } catch (err) {
    Logger.log('상태 마킹 실패: ' + err)
  }
}
