# UI 피드백 v1 — 체크리스트

## 공통 인프라
- [x] `src/lib/encode.ts` 신규 — URL param 인코딩(`encodeChurchParam`) + QR payload 인코딩(`encodeQRPayload` / `decodeQRPayload`)
- [x] `[churchId]` → `[encodedId]` 디렉토리 rename

---

## 1. /generate/[encodedId] (QR 표시 페이지)
- [x] URL param을 `${교회명}:${id}` base64url 인코딩으로 변경
- [x] QR 값을 `encodeQRPayload(churchId)` (base64url) 로 변경
- [x] 안내 문구: "스태프에게 화면 보여주세요" → "카메라에 가져다 대세요"
- [x] DEV 패널(payload 복사 UI) 제거
- [x] 100vh 고정 레이아웃
- [x] "교회 다시 선택" 버튼 글자 크기 확대 (`text-sm`)
- [x] "QR 코드" h1 크기 축소 (`text-xl`)
- [x] PNG 다운로드: 1080×1080 흰 배경 캔버스 중앙에 QR 배치
- [x] 체크인 완료 여부와 무관하게 진입 가능 (기존 동작, 변경 없음)

## 2. /generate (교회 선택 페이지)
- [x] 최초 진입 시 교회 목록 미표시 (query 빈 문자열이면 빈 화면)
- [x] query 있지만 검색 결과 없을 때: "검색된 교회가 없습니다" 문구
- [x] 100vh 고정, 목록 영역 `overflow-y-auto` 스크롤
- [x] 다음 버튼 클릭 시 `/generate/${encodeChurchParam(name, id)}` 로 이동

## 3. /api/sessions
- [x] `{ churchId }` 대신 `{ payload: string }` 수신
- [x] 서버에서 `decodeQRPayload(payload)` 로 churchId 추출

## 4. /checkin/[churchId]
### CheckinForm
- [x] 오전(~11:59) 인삿말: "안녕하세요 {name} 선교대원 여러분, 오늘도 은혜로운 선교가 되기를 소망합니다."
- [x] 오후(12:00~) 인삿말: "안녕하세요 {name} 선교대원 여러분, 오늘도 너무 고생하셨습니다." (기존 문구)
- [x] 헤더에서 "교회" 단어 제거 (교회명만 표시)
- [x] 라벨/질문 폰트 크기 확대 (`text-sm` → `text-base`, 레이블 `text-xs`)
- [x] 제출 조건: `allArrived === true` AND `headcount` 1 이상이어야 활성화
- [x] 성공 화면: 3초 카운트다운 후 `/generate/${encodedId}` 리다이렉트
- [x] 성공 화면에 "N초 후 QR 페이지로 이동합니다" 문구 + 초 감소 표시

### page.tsx
- [x] `encodedParam` 계산해서 CheckinForm에 prop 전달

## 5. /scanner
- [x] MockScannerPanel import 및 렌더링 제거 (파일 삭제)
- [x] "웹캠 스캐너" 타이틀 제거
- [x] QR 프레임 오버레이에서 가로선(십자 모양) 제거
- [x] 빨간/브랜드색 pulse-scan 배경 오버레이 제거
- [x] html5-qrcode 주입 UI(`#qr-shaded-region` 등) CSS로 숨김
- [x] `handleScanSuccess`: `decodeQRPayload(decodedText)` 로 churchId 파싱
- [x] API 호출: `{ payload: decodedText }` 전송

## 6. /dashboard
- [x] `h-screen` 고정 (min-h-screen → h-screen overflow-hidden)
- [x] "실시간 대시보드" h1 제거
- [x] 섹션 레이블("미도착" / "도착 완료") 폰트 크기 확대
- [x] 숫자: "개 교회" 제거, 크기 확대 (`text-7xl md:text-9xl`)
- [x] 미도착 리스트: `PENDING` → `미도착`, 스크롤 처리
- [x] 도착 리스트: 최신순 상위 5개 카드 + 나머지 콤마 구분 텍스트로 표시
