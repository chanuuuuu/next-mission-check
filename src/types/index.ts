export interface Church {
  id: number
  name: string
  address: string | null
  team_name: string | null
  team_type: string | null
  jin_name: string | null
  created_at: string
}

export interface Checkin {
  id: number
  church_id: number
  phase_code: string
  is_all_arrived: boolean
  total_count: number
  report_notes: string | null
  dynamic_questions: Record<string, unknown> | null
  checked_in_at: string
  updated_at: string
}

export interface ScannerSession {
  church_id: number
  status: 'PENDING' | 'SCANNED' | 'COMPLETED'
  scanned_at: string | null
  updated_at: string
}

// sessionId 없음 — churchId 기반 결정적 QR 설계
export interface QRDataPayload {
  churchId: number
}

export interface AppSettings {
  active_phase: string
}

export type PhaseCode = '1A' | '1P' | '2A' | '2P' | '3A' | '3P' | '4A' | '4P'

export const PHASE_LABELS: Record<PhaseCode, string> = {
  '1A': '1일차 아침',
  '1P': '1일차 저녁',
  '2A': '2일차 아침',
  '2P': '2일차 저녁',
  '3A': '3일차 아침',
  '3P': '3일차 저녁',
  '4A': '4일차 아침',
  '4P': '4일차 저녁',
}
