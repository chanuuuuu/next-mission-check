import { cn } from '@/lib/utils'
import { isSeatDisabled } from '../seat-manage/config/seatScores'
import type { FloorDef, SectionDef } from '../seat-manage/config/seatLayout'

export const CELL = 18

export function MobileFloorView({
  floor,
  assignments,
  highlightTeamId,
  teamColorMap,
}: {
  floor: FloorDef
  assignments: Record<string, number>
  highlightTeamId: number | null
  teamColorMap: Map<number, string>
}) {
  return (
    <div>
      <div className="bg-foreground text-background text-center font-display text-[9px] font-bold tracking-[0.4em] py-1.5 mb-1">
        STAGE · 강대상
      </div>
      <div className="overflow-x-auto">
        <div
          className={cn(
            'border-x border-b border-foreground p-2 inline-block min-w-full',
            floor.id === '1F' && 'rounded-b-[30%_15%]',
          )}
        >
          <div className="flex gap-2 justify-start items-start">
            {floor.sections.map((section, idx) => (
              <div key={section.id} className="flex gap-2 items-start shrink-0">
                <MobileSectionView
                  section={section}
                  floorId={floor.id}
                  assignments={assignments}
                  highlightTeamId={highlightTeamId}
                  teamColorMap={teamColorMap}
                />
                {idx < floor.sections.length - 1 && (
                  <div className="w-px self-stretch border-l border-dashed border-foreground/30 shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export function MobileSectionView({
  section,
  floorId,
  assignments,
  highlightTeamId,
  teamColorMap,
}: {
  section: SectionDef
  floorId: '1F' | '2F'
  assignments: Record<string, number>
  highlightTeamId: number | null
  teamColorMap: Map<number, string>
}) {
  const block = section.id.split('-')[1]
  const maxCols = Math.max(...section.rows.map((r) => r.count))

  return (
    <div className="flex flex-col items-center shrink-0">
      <span className="font-display text-[10px] font-bold tracking-widest text-foreground/50 mb-1">
        {section.label}
      </span>
      <div className="flex flex-col gap-[3px]">
        {section.rows.map((row, rIdx) => {
          const leftPad = Math.floor((maxCols - row.count) / 2)
          return (
            <div key={rIdx} className="flex gap-[3px] items-center">
              <span className="font-display text-[9px] text-foreground/40 w-4 text-right tabular-nums shrink-0">
                {rIdx + 1}
              </span>
              <div
                className="grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${maxCols}, ${CELL}px)` }}
              >
                {Array.from({ length: maxCols }).map((_, cIdx) => {
                  const inRow = cIdx >= leftPad && cIdx < leftPad + row.count
                  if (!inRow) return <span key={cIdx} style={{ width: CELL, height: CELL }} />
                  const key = `${floorId}_${block}_R${rIdx + 1}_C${cIdx - leftPad + 1}`
                  const disabled = isSeatDisabled(key)
                  const teamId = assignments[key]
                  const isHighlight = highlightTeamId !== null && teamId === highlightTeamId
                  const dimmed = highlightTeamId !== null && !isHighlight
                  const bg = disabled ? 'oklch(0.85 0 0)' : teamColorMap.get(teamId)
                  return (
                    <span
                      key={cIdx}
                      data-team-highlight={isHighlight ? teamId : undefined}
                      className={cn(
                        'border border-foreground/40 transition-opacity',
                        dimmed && 'opacity-15',
                        isHighlight && 'ring-2 ring-foreground ring-offset-0',
                      )}
                      style={{ background: bg, width: CELL, height: CELL, display: 'block' }}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
