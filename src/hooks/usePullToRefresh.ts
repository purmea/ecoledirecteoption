import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 76
const MAX = 120

/** Tirer vers le bas depuis le haut de la page pour actualiser (téléphone). */
export function usePullToRefresh(onRefresh: () => Promise<unknown>, enabled: boolean) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<{ x: number; y: number } | null>(null)
  const pullRef = useRef(0)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh

  useEffect(() => {
    if (!enabled) return
    const set = (v: number) => { pullRef.current = v; setPull(v) }
    // Pas de « tirer pour actualiser » depuis une zone qui défile à l'horizontale (barre des jours…).
    const onStart = (e: TouchEvent) => {
      const inScroller = (e.target as Element | null)?.closest?.('.day-strip, [data-no-ptr]')
      start.current = window.scrollY <= 0 && !inScroller ? { x: e.touches[0].clientX, y: e.touches[0].clientY } : null
    }
    const onMove = (e: TouchEvent) => {
      if (start.current === null || busy) return
      const dx = e.touches[0].clientX - start.current.x
      const dy = e.touches[0].clientY - start.current.y
      // Geste horizontal : on abandonne, la page ne doit pas bouger.
      if (Math.abs(dx) > Math.abs(dy)) { start.current = null; return pullRef.current && set(0) }
      if (dy <= 0) return pullRef.current && set(0)
      // résistance : plus on tire, plus c'est dur
      set(Math.min(MAX, dy * 0.5))
    }
    const onEnd = async () => {
      const v = pullRef.current
      start.current = null
      if (v >= THRESHOLD && !busy) {
        setBusy(true)
        set(THRESHOLD * 0.7)
        try { await refresh.current() } finally { setBusy(false); set(0) }
      } else set(0)
    }
    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: true })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [enabled, busy])

  return { pull, busy, ready: pull >= THRESHOLD }
}
