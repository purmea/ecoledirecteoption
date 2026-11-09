import { useEffect, useState } from 'react'
import type { Lesson } from '../types'
import { DAYS } from '../lib'

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

/** « En cours / Prochain cours dans… / Fini pour aujourd'hui », mis à jour toutes les 30 s. */
export function NowCard({ lessons }: { lessons: Lesson[] }) {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const day = (now.getDay() + 6) % 7
  const nowMin = now.getHours() * 60 + now.getMinutes()
  const active = lessons.filter((l) => !l.cancelled)
  const today = day <= 4 ? active.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start)) : []
  const current = today.find((l) => toMin(l.start) <= nowMin && nowMin < toMin(l.end))
  const next = today.find((l) => toMin(l.start) > nowMin)

  if (current) {
    const total = toMin(current.end) - toMin(current.start)
    const done = nowMin - toMin(current.start)
    return (
      <div className="now">
        <span className="now-eyebrow"><i className="live" />En cours · fin dans {dur(toMin(current.end) - nowMin)}</span>
        <strong>{current.subject}</strong>
        <small>{[current.room, current.teacher].filter(Boolean).join(' · ')}</small>
        <span className="now-bar"><span style={{ width: `${(done / total) * 100}%` }} /></span>
      </div>
    )
  }
  if (next) {
    return (
      <div className="now">
        <span className="now-eyebrow">Prochain cours dans {dur(toMin(next.start) - nowMin)}</span>
        <strong>{next.subject}</strong>
        <small>{next.start} · {[next.room, next.teacher].filter(Boolean).join(' · ')}</small>
      </div>
    )
  }
  // Plus de cours aujourd'hui : premier cours du prochain jour d'école.
  for (let k = 1; k <= 7; k++) {
    const d = (day + k) % 7
    if (d > 4) continue
    const first = active.filter((l) => l.day === d).sort((a, b) => a.start.localeCompare(b.start))[0]
    if (first) {
      return (
        <div className="now">
          <span className="now-eyebrow">{day <= 4 && today.length ? 'Fini pour aujourd’hui' : 'Pas cours aujourd’hui'}</span>
          <strong>{k === 1 ? 'Demain' : DAYS[d]} · {first.subject}</strong>
          <small>{first.start} · {[first.room, first.teacher].filter(Boolean).join(' · ')}</small>
        </div>
      )
    }
  }
  return null
}
