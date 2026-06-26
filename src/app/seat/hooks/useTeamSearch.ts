import { useEffect, useMemo, useState } from 'react'
import type { Team, FloorTab, SeatGroup } from '@/types/seating'
import { locateTeam } from '../utils/locateTeam'
import { computeTeamColors } from '../../seat-manage/config/teamColors'

interface UseTeamSearchOptions {
  teams: Team[]
  assignments: Record<string, number>
  teamToJinId?: Record<number, number>
}

interface UseTeamSearchResult {
  query: string
  setQuery: (q: string) => void
  floorTab: FloorTab
  setFloorTab: (f: FloorTab) => void
  matchedTeam: Team | null
  effectiveId: number | null
  located: SeatGroup[]
  totalSeats: number
  teamColorMap: Map<number, string>
}

export function useTeamSearch({
  teams,
  assignments,
  teamToJinId,
}: UseTeamSearchOptions): UseTeamSearchResult {
  const [query, setQuery] = useState('')
  const [floorTab, setFloorTab] = useState<FloorTab>('1F')

  const matchedTeam = useMemo(() => {
    const q = query.trim()
    if (!q) return null
    return teams.find((t) => t.church_name.includes(q)) ?? null
  }, [query, teams])

  const effectiveId = useMemo(() => {
    if (!matchedTeam) return null
    if (teamToJinId && teamToJinId[matchedTeam.id] !== undefined) {
      return teamToJinId[matchedTeam.id]
    }
    return matchedTeam.id
  }, [matchedTeam, teamToJinId])

  const located = useMemo(
    () => (effectiveId !== null ? locateTeam(assignments, effectiveId) : []),
    [effectiveId, assignments],
  )

  const primaryFloor = located[0]?.floor ?? '1F'

  useEffect(() => {
    if (matchedTeam && located.length > 0) setFloorTab(primaryFloor)
  }, [matchedTeam, primaryFloor, located.length])

  const totalSeats = useMemo(
    () =>
      effectiveId !== null
        ? Object.values(assignments).filter((tid) => tid === effectiveId).length
        : 0,
    [effectiveId, assignments],
  )

  const teamColorMap = useMemo(
    () => computeTeamColors(assignments),
    [assignments],
  )

  return {
    query,
    setQuery,
    floorTab,
    setFloorTab,
    matchedTeam,
    effectiveId,
    located,
    totalSeats,
    teamColorMap,
  }
}
