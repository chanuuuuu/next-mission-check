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
| `/api/stream/dashboard` | 1 s | New checkin row or `active_phase` change |

- Both require `export const runtime = 'edge'`.
- No LISTEN/NOTIFY available in Edge — use `setInterval` polling only.
- Mobile stream closes itself after sending `SCANNED` (one-shot).
- **Mobile stream pre-check**: at connection time, queries `checkins` for current phase. If already checked in, closes immediately without polling — prevents redirect loops.
- **Dashboard `initialized` flag**: first tick sets baseline values only (no REFRESH). Subsequent ticks emit REFRESH only when `checked_in_at` or `active_phase` changes.
- **Date comparison**: Neon returns `checked_in_at` as a JavaScript `Date` object, not a string. Always normalize via `.toISOString()` before comparing, or string comparison will always differ (reference inequality).
- **Stale SCANNED prevention**: `POST /api/checkins` deletes the `scanner_sessions` row after inserting the checkin. Without this, a leftover SCANNED row causes the mobile page to immediately redirect to `/checkin` for unrelated churches.

---

## Database Schema — Key Decisions

See `src/lib/schema.sql` for full DDL. Important design choices:

- **`scanner_sessions`**: `church_id` is the PRIMARY KEY (not a UUID session_id). Acts as a signal channel between scanner PC and mobile device. UPSERT on conflict.
- **`checkins`**: unique constraint `(church_id, phase_code)` — one check-in per church per phase.
- **`app_settings`**: key-value table. `active_phase` stores the current phase (default `'1A'`). Phase switching deletes all PENDING scanner_sessions.
- **`PhaseCode`**: `'1A' | '1B' | '2A' | '2B' | '3A' | '3B' | '3C' | '3D'` — see `src/types/index.ts`.

---

## URL Encoding — `src/lib/encode.ts`

All dynamic routes use base64url-encoded params. Never use raw IDs in URLs.

| Function | Input | Output | Usage |
|---|---|---|---|
| `encodeChurchParam(name, id)` | `string, number` | `base64url("${name}:${id}")` | Page URL params |
| `decodeChurchParam(encoded)` | `string` | `number \| null` | Decode URL param → `churchId` |
| `encodeQRPayload(churchId)` | `number` | base64url string | QR canvas value |
| `decodeQRPayload(text)` | `string` | `{ churchId: number } \| null` | Scanner decode |

- **Page URL pattern**: `/generate/[encodedId]`, `/checkin/[encodedId]` — both use `encodeChurchParam`
- **QR payload**: `encodeQRPayload(churchId)` — scanner sends this as `{ payload: string }` to `/api/sessions`, which decodes server-side with `decodeQRPayload`

---

## QR Code Rendering

Use `QRCodeCanvas` from `qrcode.react` (not `react-qr-code` — SVG only, no PNG download).

```tsx
import { QRCodeCanvas } from 'qrcode.react'
import { encodeQRPayload } from '@/lib/encode'

<QRCodeCanvas value={encodeQRPayload(churchId)} size={240} level="H" marginSize={1} />
```

---

## Design System

Tailwind CSS v4 — **no `tailwind.config.js`**. Configuration is CSS-first via `@theme` in `globals.css`.

- Brand color: `oklch(0.582 0.234 27.5)` → `text-brand`, `bg-brand`, `border-brand`
- All border radii: **0px** (intentional — sharp corners throughout)
- Display font: **Space Grotesk** → `font-display`
- Body font: **DM Sans** → `font-body`
- Keyframes: `pulse-scan` (opacity pulse), `slide-up` (fade + translate), `shimmer-scan` (horizontal shimmer for scanner overlay)
- Animation utilities: `animate-[var(--animate-pulse-scan)]`, `animate-[var(--animate-slide-up)]`, `animate-[var(--animate-shimmer-scan)]`

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
- **Duplicate check-in**: server component in `/checkin/[encodedId]/page.tsx` decodes the param with `decodeChurchParam`, then queries checkins. If already checked in, server-side `redirect('/generate/${encodeChurchParam(...)}')`.
- **Generate page SSE guard**: `'use client'` component queries current phase + checkins before opening the mobile SSE. Only opens `EventSource` when `checkinsLoaded && !isCheckedIn`. Shows DONE badge + dimmed QR if already checked in (no SSE opened).
- **Dev mode helpers removed**: `MockScannerPanel` deleted; DEV payload panel in `/generate/[encodedId]` removed. Both were development scaffolding only.
