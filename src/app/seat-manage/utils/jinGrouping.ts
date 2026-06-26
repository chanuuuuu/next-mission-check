import type { Team, JinUnit, JinAlgoResult, AlgoResult } from '@/types/seating'

// Stable positive syntheticId per jinName — avoids negative modulo in computeTeamColors.
// Uses sorted index so IDs are deterministic given the same team list.
function buildSortedJinNames(teams: Team[]): string[] {
  const names = new Set<string>()
  for (const t of teams) names.add(t.jin_name ?? t.church_name)
  return [...names].sort()
}

export function getJinSyntheticId(jinName: string, sortedJinNames: string[]): number {
  const idx = sortedJinNames.indexOf(jinName)
  return 1_000_000 + (idx >= 0 ? idx : sortedJinNames.length)
}

export function buildJinUnits(teams: Team[]): JinUnit[] {
  const sortedJinNames = buildSortedJinNames(teams)
  const groups = new Map<string, Team[]>()

  for (const t of teams) {
    const key = t.jin_name ?? t.church_name
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(t)
  }

  return sortedJinNames.map((jinName) => {
    const members = groups.get(jinName) ?? []
    const headcount = members.reduce((s, m) => s + m.headcount, 0)
    const accumulated_score =
      members.length > 0
        ? members.reduce((s, m) => s + m.accumulated_score, 0) / members.length
        : 0
    const team_type = members.every((m) => m.team_type === 'ADULT') ? 'ADULT' : (members[0]?.team_type ?? null)

    return {
      syntheticId: getJinSyntheticId(jinName, sortedJinNames),
      jinName,
      memberTeamIds: members.map((m) => m.id),
      headcount,
      accumulated_score,
      team_type,
    }
  })
}

export function jinUnitsToFakeTeams(units: JinUnit[]): Team[] {
  return units.map((u) => ({
    id: u.syntheticId,
    church_id: -1,
    church_name: u.jinName,
    team_name: null,
    team_type: u.team_type,
    jin_name: u.jinName,
    headcount: u.headcount,
    accumulated_score: u.accumulated_score,
  }))
}

export function algoResultsToJinResults(results: AlgoResult[], units: JinUnit[]): JinAlgoResult[] {
  const unitMap = new Map(units.map((u) => [u.syntheticId, u]))
  return results
    .filter((r) => r.seatKeys.length > 0)
    .map((r) => {
      const unit = unitMap.get(r.teamId)!
      return {
        syntheticId: r.teamId,
        jinName: unit.jinName,
        memberTeamIds: unit.memberTeamIds,
        seatKeys: r.seatKeys,
        block: r.block,
        floor: r.floor,
        earnedScore: r.earnedScore,
      }
    })
}
