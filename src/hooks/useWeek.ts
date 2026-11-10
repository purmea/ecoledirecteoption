import { useEffect, useMemo, useState } from 'react'
import { displayedMonday, isoDate } from '../api/ecoledirecte'
import { useData, useSession } from '../state/session'
import type { Lesson } from '../types'

/** Cours d'une semaine (0 = semaine affichée, 1 = suivante, -1 = précédente) avec tes modifications appliquées. */
export function useWeek(offset: number) {
  const { lessons: current } = useData()
  const { loadWeek, applyPlan } = useSession()
  const [weeks, setWeeks] = useState<Record<number, { lessons: Lesson[]; monday: string }>>({})
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (offset === 0 || weeks[offset]) return
    let alive = true
    setLoading(true)
    setFailed(false)
    loadWeek(offset)
      .then((w) => alive && setWeeks((x) => ({ ...x, [offset]: w })))
      .catch(() => alive && setFailed(true))
      .finally(() => alive && setLoading(false))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offset])

  // Semaine courante : toujours les données de l'app (actualisées avec elle) ; les autres : chargées à la demande.
  const raw = offset === 0 ? { lessons: current, monday: isoDate(displayedMonday()) } : weeks[offset]
  const lessons = useMemo(() => (raw ? applyPlan(raw.lessons, raw.monday) : []), [raw, applyPlan])
  return { lessons, monday: raw?.monday, loading: loading && !raw, failed }
}
