import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // /inquiry/admin 하위 경로 (로그인 페이지 제외) 보호
  if (pathname.startsWith('/inquiry/admin') && !pathname.startsWith('/inquiry/admin/login')) {
    const session = req.cookies.get('inquery_admin_session')
    if (!session || session.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/inquiry/admin/login', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/inquiry/admin/:path*'],
}
