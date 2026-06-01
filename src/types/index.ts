export interface Church {
  id: number
  name: string
  address: string | null
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

// --- 선교 등록 관리 시스템 타입 ---

export interface MissionRegistration {
  id: string
  department_main: string
  sub_department_1: string
  sub_department_2: string | null
  small_group: string | null
  name: string
  phone_last_four: string
  church_name: string | null
  arrival_time: string | null
  use_personal_car: boolean | null
  use_car_during_mission: string | null
  use_return_bus: boolean | null
  schedule_survey: string | null
  payment_status: boolean
  created_at: string
  updated_at: string
}

export interface FormMappingConfig {
  sub_department_1: string
  sub_department_2: string | null
  small_group: string | null
  name: string
  phone_last_four: string
  church_name: string | null
  arrival_time: string
  use_personal_car: string
  use_car_during_mission: string | null
  use_return_bus: string
  schedule_survey: string | null
}

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
