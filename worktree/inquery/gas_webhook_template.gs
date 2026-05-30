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

const WEBHOOK_URL = 'https://[YOUR_DOMAIN]/api/inquery/sync/webhook'
const DEPARTMENT = '2청' // '2청' | '기타부서' | '청장년' 중 하나로 변경
const SYNC_STATUS_COLUMN = '동기화 상태'
const MAX_RETRIES = 3

function onFormSubmit(e) {
  const namedValues = e.namedValues

  const payload = JSON.stringify({
    department: DEPARTMENT,
    namedValues: namedValues,
  })

  let success = false
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'post',
        contentType: 'application/json',
        payload: payload,
        muteHttpExceptions: true,
      })

      if (response.getResponseCode() === 200 || response.getResponseCode() === 201) {
        success = true
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
      const name = namedValues['이름'] ? namedValues['이름'][0] : '(이름 없음)'
      UrlFetchApp.fetch(discordUrl, {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify({
          username: '선교 등록 시스템',
          embeds: [{
            title: `⚠️ 동기화 실패 — ${DEPARTMENT}`,
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
