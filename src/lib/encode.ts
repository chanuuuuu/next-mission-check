function toBase64url(str: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(str, 'utf8').toString('base64url')
  }
  const bytes = new TextEncoder().encode(str)
  let binary = ''
  bytes.forEach((b) => (binary += String.fromCharCode(b)))
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function fromBase64url(b64: string): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(b64, 'base64url').toString('utf8')
  }
  const padded = b64.replace(/-/g, '+').replace(/_/g, '/')
  const pad = padded.length % 4
  const padded2 = pad ? padded + '='.repeat(4 - pad) : padded
  const binary = atob(padded2)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

// URL param: encodes "${name}:{id}" — use lastIndexOf(':') to split safely
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

// QR canvas value: encodes JSON { churchId }
export function encodeQRPayload(churchId: number): string {
  return toBase64url(JSON.stringify({ churchId }))
}

export function decodeQRPayload(encoded: string): { churchId: number } | null {
  try {
    const parsed = JSON.parse(fromBase64url(encoded))
    if (typeof parsed?.churchId !== 'number') return null
    return parsed
  } catch {
    return null
  }
}
