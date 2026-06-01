import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'

export const runtime = 'edge'

const COOKIE_NAME = 'inquery_admin_session'
const COOKIE_MAX_AGE = 60 * 60 * 8 // 8시간

// POST /api/inquery/auth — PIN 검증 후 쿠키 발급
export async function POST(req: NextRequest) {
  const { pin } = await req.json() as { pin: string }

  const hash = process.env.ADMIN_PIN_HASH
  if (!hash) {
    return NextResponse.json({ error: '서버 설정 오류' }, { status: 500 })
  }

  const valid = await bcryptjs.compare(pin, hash)
  if (!valid) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/inquiry/admin',
    // production에서 secure: true 적용
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}

// DELETE /api/inquery/auth — 로그아웃 (쿠키 삭제)
export async function DELETE() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    maxAge: 0,
    path: '/inquiry/admin',
  })
  return res
}
