import type { Team, SeatGroup } from '@/types/seating'

interface Props {
  matchedTeam: Team
  located: SeatGroup[]
  effectiveId: number
  teamColorMap: Map<number, string>
  totalSeats: number
  teamToJinId?: Record<number, number>
}

export function SeatInfoCard({
  matchedTeam,
  located,
  effectiveId,
  teamColorMap,
  totalSeats,
  teamToJinId,
}: Props) {
  return (
    <div className="border border-foreground">
      <div
        className="px-4 py-3 border-b border-foreground flex items-center gap-3"
        style={{ background: teamColorMap.get(effectiveId) }}
      >
        <span className="font-display text-lg font-bold">
          {matchedTeam.church_name}
        </span>
        {teamToJinId?.[matchedTeam.id] !== undefined && matchedTeam.jin_name ? (
          <span className="font-display text-sm border border-foreground/60 bg-background px-2 py-0.5">
            {matchedTeam.jin_name}
          </span>
        ) : matchedTeam.team_name ? (
          <span className="font-display text-sm text-foreground/70">
            {matchedTeam.team_name}
          </span>
        ) : null}
        <span className="ml-auto font-display font-bold text-sm border border-foreground/60 bg-background px-2 py-0.5">
          {totalSeats}석
        </span>
      </div>
      <ul className="divide-y divide-foreground">
        {located.map((g) => (
          <li key={g.sectionId} className="px-4 py-3 flex items-center gap-3">
            <span className="bg-foreground text-background font-display font-bold text-[10px] px-2 py-1 tracking-[0.2em] shrink-0">
              {g.floor}
            </span>
            <span className="font-display font-bold text-sm">
              {g.sectionLabel}구역 · {g.rowIndices.map((r) => `${r + 1}열`).join(', ')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
