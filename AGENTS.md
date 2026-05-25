# Agent Rules — next-mission-check

## Next.js 16 Breaking Changes

This project runs Next.js **16.2.6**. The following differ from prior versions:

- **`params` is a Promise** in all dynamic routes. Always `await params` in server components, `use(params)` in client components. Never destructure directly.
  ```ts
  // Server component
  const { churchId } = await params
  // Client component
  const { churchId } = use(params)
  ```
- **`RouteContext`** is the correct type for dynamic route props (`{ params: Promise<{ id: string }> }`).
- Read `node_modules/next/dist/docs/` before making assumptions about any Next.js API.

---

## Edge Runtime — Neon DB

All API routes use `export const runtime = 'edge'`. The following constraints apply:

- **Use `neon()` (HTTP driver), never `Pool`**. `Pool` does not work in Edge Runtime.
  ```ts
  import { neon } from '@neondatabase/serverless'
  export const sql = neon(process.env.DATABASE_URL!)
  ```
- **Template literals return `any[]`** — `neon()` does not support generic type parameters.  
  Always cast the result explicitly:
  ```ts
  const rows = (await sql`SELECT * FROM churches`) as Church[]
  ```

---

## SSE (Server-Sent Events)

Two SSE route handlers exist under `src/app/api/stream/`:

| Route | Interval | Trigger |
|---|---|---|
| `/api/stream/mobile?churchId=X` | 1 s | `scanner_sessions` row for `church_id` reaches SCANNED status |
| `/api/stream/dashboard` | 2 s | New checkin row or `active_phase` change |

- Both require `export const runtime = 'edge'`.
- No LISTEN/NOTIFY available in Edge — use `setInterval` polling only.
- Mobile stream closes itself after sending `SCANNED` (one-shot).
- Dashboard stream tracks last `checked_in_at` and last phase to avoid duplicate REFRESH events.

---

## Database Schema — Key Decisions

See `src/lib/schema.sql` for full DDL. Important design choices:

- **`scanner_sessions`**: `church_id` is the PRIMARY KEY (not a UUID session_id). Acts as a signal channel between scanner PC and mobile device. UPSERT on conflict.
- **`checkins`**: unique constraint `(church_id, phase_code)` — one check-in per church per phase.
- **`app_settings`**: key-value table. `active_phase` stores the current phase (default `'1A'`). Phase switching deletes all PENDING scanner_sessions.
- **`PhaseCode`**: `'1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '3C' | '3D'` — see `src/types/index.ts`.

---

## QR Code Format

QR value is always `JSON.stringify({ churchId: Number(id) })`.  
Use `QRCodeCanvas` from `qrcode.react` (not `react-qr-code` — SVG only, no PNG download).

```tsx
import { QRCodeCanvas } from 'qrcode.react'
<QRCodeCanvas value={JSON.stringify({ churchId })} size={240} />
```

---

## Design System

Tailwind CSS v4 — **no `tailwind.config.js`**. Configuration is CSS-first via `@theme` in `globals.css`.

- Brand color: `oklch(0.582 0.234 27.5)` → `text-brand`, `bg-brand`, `border-brand`
- All border radii: **0px** (intentional — sharp corners throughout)
- Display font: **Space Grotesk** → `font-display`
- Body font: **DM Sans** → `font-body`
- Keyframes: `pulse-scan` (opacity pulse), `slide-up` (fade + translate)
- Animation utilities: `animate-[var(--animate-pulse-scan)]`, `animate-[var(--animate-slide-up)]`

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Neon DB connection string |
| `NEXT_PUBLIC_BASE_URL` | Production only | Used by server components for absolute fetch URLs. Defaults to `http://localhost:3000` |
| `DISCORD_WEBHOOK_URL` | No | Scan error alerts. Swallowed silently if absent |

---

## Project-Specific Patterns

- **RSC + Client split**: pages that need SSE or interactivity use a server component (initial data fetch) wrapping a `'use client'` component (`DashboardClient`, `CheckinForm`).
- **`lovable_design/`**: reference-only Lovable output. Excluded from `tsconfig.json`. Do not import from it.
- **Duplicate check-in**: server component in `/checkin/[churchId]/page.tsx` checks for existing checkin before rendering the form. Returns a static "already checked in" screen if duplicate.
- **Dev mode helpers**: `/generate/[churchId]` shows QR payload text + copy button; `/scanner` renders `MockScannerPanel` for testing without a webcam.
