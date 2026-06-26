import { useEffect } from 'react'
import type { FloorTab } from '@/types/seating'

export function useAutoScroll(
  effectiveId: number | null,
  matchedTeamId: number | null,
  floorTab: FloorTab,
) {
  useEffect(() => {
    if (effectiveId === null) return
    const t = setTimeout(() => {
      const els = document.querySelectorAll<HTMLElement>(
        `[data-team-highlight="${effectiveId}"]`,
      )
      if (!els.length) return

      let minLeft = Infinity,
        maxRight = -Infinity,
        minTop = Infinity,
        maxBottom = -Infinity
      els.forEach((el) => {
        const r = el.getBoundingClientRect()
        minLeft = Math.min(minLeft, r.left)
        maxRight = Math.max(maxRight, r.right)
        minTop = Math.min(minTop, r.top)
        maxBottom = Math.max(maxBottom, r.bottom)
      })

      const blockCenterX = (minLeft + maxRight) / 2
      const blockCenterY = (minTop + maxBottom) / 2

      const targetScrollY =
        window.scrollY + blockCenterY - window.innerHeight / 2
      window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' })

      const container = els[0].closest<HTMLElement>('.overflow-x-auto')
      if (container) {
        const targetLeft =
          container.scrollLeft + blockCenterX - window.innerWidth / 2
        container.scrollTo({
          left: Math.max(0, targetLeft),
          behavior: 'smooth',
        })
      }
    }, 150)
    return () => clearTimeout(t)
  }, [effectiveId, matchedTeamId, floorTab])
}
