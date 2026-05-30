'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ClipboardList, ShieldCheck } from 'lucide-react'

const TABS = [
  { href: '/inquiry', label: '사용자 조회', icon: ClipboardList },
  { href: '/inquiry/admin', label: '관리자', icon: ShieldCheck },
] as const

export default function RegistrationNav() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-40 bg-background border-b border-foreground">
      <div className="px-6 md:px-12 flex items-center justify-between">
        <Link
          href="/"
          className="font-display text-[10px] font-bold tracking-[0.25em] uppercase text-muted-foreground py-4 hover:text-brand transition-colors"
        >
          ← Mission System
        </Link>
        <div className="flex">
          {TABS.map(({ href, label, icon: Icon }) => {
            const active =
              href === '/inquiry/admin'
                ? pathname.startsWith('/inquiry/admin')
                : pathname === '/inquiry'
            return (
              <Link
                key={href}
                href={href}
                className={
                  'inline-flex items-center gap-2 px-5 py-4 font-display text-xs font-bold uppercase tracking-widest border-b-2 transition-colors ' +
                  (active
                    ? 'border-brand text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground')
                }
              >
                <Icon size={14} />
                {label}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
