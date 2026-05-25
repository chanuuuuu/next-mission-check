# UI 피드백 v1 — 체크리스트

## 공통 인프라
- [x] `src/lib/encode.ts` 신규 — URL param 인코딩(`encodeChurchParam`) + QR payload 인코딩(`encodeQRPayload` / `decodeQRPayload`)
- [x] `/checkin/[churchId]` → `/checkin/[encodedId]` 디렉토리 rename (generate와 동일한 base64url 패턴)

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
- [x] 체크인 완료 여부 사전 확인 후 SSE 연결 — 이미 완료된 교회는 SSE 미연결, DONE 배지 + 반투명 QR 표시
- [x] SSE SCANNED 수신 시 `router.push('/checkin/${encodedId}')` — encodedId 재사용 (교회명 재조회 불필요)

## 2. /generate (교회 선택 페이지)
- [x] 최초 진입 시 교회 목록 미표시 (query 빈 문자열이면 빈 화면)
- [x] query 있지만 검색 결과 없을 때: "검색된 교회가 없습니다" 문구
- [x] 100vh 고정, 목록 영역 `overflow-y-auto` 스크롤
- [x] 다음 버튼 클릭 시 `/generate/${encodeChurchParam(name, id)}` 로 이동

## 3. /api/sessions
- [x] `{ churchId }` 대신 `{ payload: string }` 수신
- [x] 서버에서 `decodeQRPayload(payload)` 로 churchId 추출

## 4. /checkin/[encodedId]
### page.tsx
- [x] URL `[churchId]` → `[encodedId]` (base64url 디코딩으로 churchId 추출)
- [x] `decodeChurchParam` 실패 시 "잘못된 접근" 오류 화면 표시
- [x] isDuplicate 시 서버사이드 `redirect('/generate/${encodeChurchParam(...)}')

### CheckinForm
- [x] 인삿말에서 "안녕하세요" 제거, 두 줄 구성 유지
  - 오전(A phase): `${name} 선교대원 여러분,\n오늘도 은혜로운 선교가 되기를 소망합니다.`
  - 오후(P phase): `${name} 선교대원 여러분,\n오늘도 너무 고생하셨습니다.`
- [x] 헤더 폰트 `text-xl` (너비에 맞게 조정)
- [x] 100vh 고정 레이아웃, 폼 영역 `overflow-y-auto`
- [x] 섹션 레이블 `text-xs` → `text-sm`
- [x] 도착 여부 버튼 `p-4 text-base`, 체크박스 `size-6` 유지
- [x] 인원 수 입력 `text-4xl` → `text-3xl`
- [x] textarea `rows={4}` → `rows={3}`
- [x] 완료 버튼 `py-5` → `py-3`
- [x] 필드 간격 `space-y-10` → `space-y-8`, 세로 패딩 `py-8`
- [x] 제출 조건: `allArrived === true` AND `headcount` 1 이상이어야 활성화
- [x] 성공 화면: 3초 카운트다운 후 `/generate/${encodeChurchParam(...)}` 리다이렉트
- [x] **버그픽스**: `router.push()`를 `setCountdown` 콜백 내부에서 호출 시 발생하는 "Cannot update Router while rendering" 경고 해소 — countdown dep useEffect로 분리

## 5. /scanner
- [x] MockScannerPanel import 및 렌더링 제거 (파일 삭제)
- [x] "웹캠 스캐너" 타이틀 제거
- [x] QR 프레임 오버레이에서 가로선(십자 모양) 제거
- [x] 빨간/브랜드색 pulse-scan 배경 오버레이 제거
- [x] html5-qrcode 주입 UI(`#qr-shaded-region` 등) CSS로 숨김
- [x] `handleScanSuccess`: `decodeQRPayload(decodedText)` 로 churchId 파싱
- [x] API 호출: `{ payload: decodedText }` 전송
- [x] 카메라 UI 크기 축소 (`max-w-5xl` → `max-w-3xl`)
- [x] 스캔 박스 brand tint + 수직 shimmer 애니메이션 (`globals.css`에 `@keyframes shimmer-scan` 추가)
- [x] 모서리 브라켓 두께 `border-[3px]`
- [x] 카메라 하단 "생성된 QR 코드를 카메라에 가져다 대주세요" 안내 문구

## 6. /dashboard
- [x] `h-screen` 고정 (min-h-screen → h-screen overflow-hidden)
- [x] "실시간 대시보드" h1 제거
- [x] 섹션 레이블("미도착" / "도착 완료") 폰트 크기 확대
- [x] 숫자: "개 교회" 제거, `text-[clamp(4rem,12vw,28rem)] xl:text-[clamp(4rem,22vw,28rem)]` — 뷰포트 반응형
- [x] 미도착 리스트: `PENDING` → `미도착`, 스크롤 처리
- [x] 도착 리스트: 최신순 상위 5개 카드 + 나머지 콤마 구분 텍스트로 표시

---

## 버그픽스 및 안정성

### 무한 리다이렉트 루프 해소
- [x] `generate` 페이지: SSE 열기 전 checkins 테이블 사전 확인 — 이미 완료된 교회는 SSE 미연결
- [x] `api/stream/mobile`: 연결 시 checkins 테이블 확인, 완료 교회는 stream 즉시 close
- [x] `api/checkins POST`: 체크인 완료 후 `scanner_sessions` 삭제 — stale SCANNED 방지

### 대시보드 SSE
- [x] `initialized` 플래그 도입 — 첫 번째 tick은 기준값만 설정, phase 첫 체크인도 REFRESH 정상 발생
- [x] Date 객체 → `.toISOString()` 변환으로 타임스탬프 비교 안전화
- [x] 폴링 interval `2000ms` → `1000ms`
