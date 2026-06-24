export interface Team {
  id: number
  church_id: number
  church_name: string
  team_name: string | null
  team_type: 'YOUTH' | 'ADULT' | null
  headcount: number
  accumulated_score: number
}

export interface Phase {
  id: number
  phase_number: number
  description: string | null
}

export interface SeatAssignment {
  id: number
  phase_id: number
  team_id: number
  floor: number
  block: string
  assigned_seats: string[]
  earned_score: number
}

export interface AlgoResult {
  teamId: number
  seatKeys: string[]
  block: string
  floor: number
  earnedScore: number
}
