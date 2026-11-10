import { useEffect, useMemo, useState } from 'react'
import type { Lesson } from '../types'
import { DAYS } from '../lib'
import { useSession } from '../state/session'

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}
const dur = (min: number) => {
  if (min < 60) return `${min} min`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

interface Upcoming { lesson: Lesson; days: number } // days : nombre de jours à partir d'aujourd'hui

/** Libellé du jour : « 08:00 » aujourd'hui, « Demain 08:00 », « Mer. 08:00 »… */
function when(u: Upcoming, today: number) {
  if (u.days === 0) return u.lesson.start
  if (u.days === 1) return `Demain ${u.lesson.start}`
  return `${DAYS[(today + u.days) % 7].slice(0, 3)}. ${u.lesson.start}`
}

/** « En cours · fin dans… » ou « Prochain cours dans… », puis les 3 prochains cours. */
export function NowCard({ lessons }: { lessons: Lesson[] }) {
  const { loadWeek, applyPlan } = useSession()
  const [now, setNow] = useState(() => new Date())
  const [nextWeek, setNextWeek] = useState<{ lessons: Lesson[]; monday: string } | null>(null)
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const day = (now.getDay() + 6) % 7 // 0 = lundi … 6 = dimanche
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const active = useMemo(() => lessons.filter((l) => !l.cancelled), [lessons])

  const current = day <= 4 ? active.find((l) => l.day === day && toMin(l.start) <= nowMin && nowMin < toMin(l.end)) : undefined

  // Cours à venir cette semaine (aujourd'hui après maintenant, puis les jours suivants)
  const thisWeek: Upcoming[] = active
    .filter((l) => l.day > day || (l.day === day && toMin(l.start) > nowMin))
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((l) => ({ lesson: l, days: l.day - day }))

  // Pas assez de cours cette semaine : on va chercher la semaine suivante
  const needMore = thisWeek.length < 3
  useEffect(() => {
    if (!needMore || nextWeek) return
    let alive = true
    loadWeek(1).then((w) => alive && setNextWeek(w)).catch(() => alive && setNextWeek({ lessons: [], monday: '' }))
    return () => { alive = false }
  }, [needMore, nextWeek, loadWeek])

  const following: Upcoming[] = (nextWeek ? applyPlan(nextWeek.lessons, nextWeek.monday) : [])
    .filter((l) => !l.cancelled)
    .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
    .map((l) => ({ lesson: l, days: l.day + 7 - day }))
  const next3 = [...thisWeek, ...following].slice(0, 3)

  if (!current && next3.length === 0) return null

  const first = next3[0]
  const headline = current
    ? `En cours · fin dans ${dur(toMin(current.end) - nowMin)}`
    : first.days === 0 ? `Prochain cours dans ${dur(toMin(first.lesson.start) - nowMin)}`
    : day <= 4 && active.some((l) => l.day === day) ? 'Fini pour aujourd’hui' : 'Pas cours aujourd’hui'

  return (
    <div className="now">
      <span className="now-eyebrow">{current && <i className="live" />}{headline}</span>
      {current && (
        <>
          <strong>{current.subject}</strong>
          <small>{[current.room, current.teacher].filter(Boolean).join(' · ')}</small>
          <span className="now-bar">
            <span style={{ width: `${((nowMin - toMin(current.start)) / (toMin(current.end) - toMin(current.start))) * 100}%` }} />
          </span>
        </>
      )}
      {next3.length > 0 && (
        <>
          <h3 className="now-next">À suivre</h3>
          <ul className="now-list">
            {next3.map((u) => (
              <li key={`${u.days}-${u.lesson.id}`}>
                <span className="now-when">{when(u, day)}</span>
                <span className="grow">
                  <strong>{u.lesson.subject}</strong>
                  <small>{[u.lesson.room, u.lesson.teacher].filter(Boolean).join(' · ')}</small>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
