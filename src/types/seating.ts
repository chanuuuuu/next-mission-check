export type DayKey = 'thu' | 'fri' | 'sat' | 'sun'
export type JinPlacementStatus = 'placed' | 'ready' | 'unplaced'

export interface Team {
  id: number
  church_id: number
  church_name: string
  team_name: string | null
  team_type: 'YOUTH' | 'ADULT' | null
  jin_name: string | null
  headcount: number
  accumulated_score: number
  headcount_thu: number | null
  headcount_fri: number | null
  headcount_sat: number | null
  headcount_sun: number | null
}

export interface Phase {
  id: number
  phase_number: number
  description: string | null
  assignment_mode: 'team' | 'jin'
}

export interface JinUnit {
  syntheticId: number
  jinName: string
  memberTeamIds: number[]
  headcount: number
  accumulated_score: number
  team_type: 'YOUTH' | 'ADULT' | null
}

export interface JinAlgoResult {
  syntheticId: number
  jinName: string
  memberTeamIds: number[]
  seatKeys: string[]
  block: string
  floor: number
  earnedScore: number
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

export type FloorTab = '1F' | '2F'

export interface SeatGroup {
  floor: FloorTab
  sectionId: string
  sectionLabel: string
  rowIndices: number[]
}
