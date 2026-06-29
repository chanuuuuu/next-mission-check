function toBase64url(str: string): string {
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64url(b64: string): string {
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const padded2 = pad ? padded + '='.repeat(4 - pad) : padded
  const binary = atob(padded2)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

export function encodeChurchParam(name: string, id: number): string {
  return toBase64url(`${name}:${id}`)
}

export function decodeChurchParam(encoded: string): number | null {
  try {
    const decoded = fromBase64url(encoded)
    const last = decoded.lastIndexOf(':')
    const id = parseInt(decoded.slice(last + 1), 10)
    return isNaN(id) ? null : id
  } catch {
    return null
  }
}

export function encodeCheckinParam(name: string, id: number): string {
  return toBase64url(`${name}:${id}:c`)
}

export function decodeCheckinParam(encoded: string): number | null {
  try {
    const decoded = fromBase64url(encoded)
    const parts = decoded.split(':')
    if (parts[parts.length - 1] !== 'c') return null
    const id = parseInt(parts[parts.length - 2], 10)
    return isNaN(id) ? null : id
  } catch {
    return null
  }
}

const QR_HASH = 'sc'

export function encodeQRPayload(churchId: number): string {
  return toBase64url(JSON.stringify({ h: QR_HASH, id: churchId }))
}

export function decodeQRPayload(encoded: string): { churchId: number } | null {
  try {
    const parsed = JSON.parse(fromBase64url(encoded))
    if (parsed?.h !== QR_HASH) return null
    if (typeof parsed?.id !== 'number') return null
    return { churchId: parsed.id }
  } catch {
    return null
  }
}
