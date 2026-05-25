# next-mission-check

선교 대원 QR 셀프 체크인 시스템. 교회별 QR 코드를 스캔하면 체크인 폼으로 자동 이동하고, 관리자 대시보드에 실시간 반영됩니다.

## 기술 스택

- **Framework**: Next.js 16 (App Router)
- **Database**: Neon DB (Serverless Postgres)
- **Realtime**: SSE (Server-Sent Events, Edge Runtime)
- **Data Fetching**: TanStack Query v5
- **Styling**: Tailwind CSS v4

## 페이지 구조

| 경로 | 설명 |
|---|---|
| `/generate` | 교회 선택 |
| `/generate/[churchId]` | QR 코드 표시 + PNG 다운로드 |
| `/scanner` | 웹캠 QR 스캐너 |
| `/checkin/[churchId]` | 셀프 체크인 폼 |
| `/dashboard` | 실시간 체크인 현황판 |
| `/admin` | 관리자 패널 (Phase 전환, 교회 관리, 수동 체크인) |

## 체크인 플로우

```
[PC 운영자]  /generate → 교회 선택 → QR 표시
                                        ↓
[모바일 대원]              QR 스캔 → /scanner
                                        ↓ POST /api/sessions
                              /checkin/[churchId] 자동 이동 (SSE)
                                        ↓ 인원 수 + 메모 입력
                                  POST /api/checkins
                                        ↓
[대시보드]                  실시간 반영 (SSE REFRESH)
```

## 환경 변수

`.env.local` 파일에 아래 변수를 설정합니다.

```env
DATABASE_URL=               # Neon DB 연결 문자열
NEXT_PUBLIC_BASE_URL=       # 배포 URL (예: https://example.com)
DISCORD_WEBHOOK_URL=        # 스캔 오류 알림용 Discord Webhook (선택)
```

## 로컬 실행

```bash
npm install
npm run dev
```

### DB 초기화 (최초 1회)

`src/lib/schema.sql`을 Neon 콘솔에서 실행하거나, psql로 적용합니다.

```bash
# 시드 데이터 삽입 (교회 10개 + 샘플 체크인)
npx tsx --env-file=.env.local src/lib/seed.ts
```

## 개발 모드 편의 기능

- `/generate/[churchId]`: QR 페이로드 텍스트 + 복사 버튼 노출
- `/scanner`: MockScannerPanel — JSON 직접 입력 후 스캔 트리거 (웹캠 없이 테스트 가능)
