import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '영동선교 체크인 — 교회 선택',
  openGraph: {
    title: '영동선교 체크인 — 교회 선택',
    description: '영동선교 복귀 체크인용 QR 목록입니다. 팀의 교회를 선택하세요.',
    images: [{ url: '/logo.png', width: 277, height: 339 }],
  },
}

export default function GenerateLayout({ children }: { children: React.ReactNode }) {
  return children
}
