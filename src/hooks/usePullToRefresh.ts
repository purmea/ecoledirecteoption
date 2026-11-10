import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 76
const MAX = 120

/** Tirer vers le bas depuis le haut de la page pour actualiser (téléphone). */
export function usePullToRefresh(onRefresh: () => Promise<unknown>, enabled: boolean) {
  const [pull, setPull] = useState(0)
  const [busy, setBusy] = useState(false)
  const start = useRef<number | null>(null)
  const pullRef = useRef(0)
  const refresh = useRef(onRefresh)
  refresh.current = onRefresh

  useEffect(() => {
    if (!enabled) return
    const set = (v: number) => { pullRef.current = v; setPull(v) }
    const onStart = (e: TouchEvent) => { start.current = window.scrollY <= 0 ? e.touches[0].clientY : null }
    const onMove = (e: TouchEvent) => {
      if (start.current === null || busy) return
      const dy = e.touches[0].clientY - start.current
      if (dy <= 0) return set(0)
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
