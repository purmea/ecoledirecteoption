import { useEffect, useMemo, useRef, useState } from 'react'
import { useData, useSession } from '../state/session'
import { formatDate } from '../lib'
import { Empty, PageHeader } from '../components/ui'
import { celebrate, haptic, toast } from '../fx'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mondayOf = (isoDate: string) => {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

/** « aujourd'hui », « demain », « mardi », ou « mardi 17 » au-delà de la semaine. */
function dayLabel(due: string, now = new Date()) {
  const days = Math.round((new Date(due + 'T12:00:00').getTime() - new Date(iso(now) + 'T12:00:00').getTime()) / 864e5)
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'demain'
  if (days > 1 && days < 7) return formatDate(due, { weekday: 'long' })
  return formatDate(due, { weekday: 'long', day: 'numeric' })
}

export function Devoirs() {
  const { homework } = useData()
  const { toggleHomework } = useSession()
  const stripRef = useRef<HTMLDivElement>(null)

  // Jours qui ont des devoirs (triés), avec le nombre restant à faire pour chacun.
  const days = useMemo(() => {
    const map = new Map<string, { total: number; left: number }>()
    for (const h of homework) {
      const d = map.get(h.due) ?? { total: 0, left: 0 }
      d.total++
      if (!h.done) d.left++
      map.set(h.due, d)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([due, v]) => ({ due, ...v }))
  }, [homework])

  // Jour choisi par défaut : le premier jour (à partir d'aujourd'hui) qui a encore des devoirs.
  const [day, setDay] = useState<string>(() => {
    const today = iso(new Date())
    return (days.find((d) => d.due >= today && d.left > 0) ?? days.find((d) => d.due >= today) ?? days.at(-1) ?? { due: today }).due
  })

  // Garde le jour choisi visible dans la barre
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [day])

  const list = homework.filter((h) => h.due === day)
  const total = homework.length
  const doneCount = homework.filter((h) => h.done).length
  const current = days.find((d) => d.due === day)

  const onCheck = (id: string, due: string, wasDone: boolean) => {
    haptic()
    toggleHomework(id)
    // Restant pour CE jour, après le changement.
    const dayItems = homework.filter((h) => h.due === due)
    const left = dayItems.filter((h) => (h.id === id ? wasDone : !h.done)).length
    const when = dayLabel(due)
    if (wasDone) return toast(`${left} à faire pour ${when}`)
    const allLeft = homework.filter((h) => (h.id === id ? false : !h.done)).length
    if (allLeft === 0) {
      celebrate()
      return toast('Tout est fait, bravo !', 'party')
    }
    if (left === 0) return toast(`Tout est fait pour ${when}`, 'party')
    toast(`Plus que ${left} devoir${left > 1 ? 's' : ''} pour ${when}`)
  }

  let lastWeek = ''
  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount} sur ${total} terminés`} />

      {days.length === 0 ? <Empty>Aucun devoir</Empty> : (
        <>
          <div className="day-strip" ref={stripRef} role="tablist" aria-label="Jour">
            {days.map((d) => {
              const week = mondayOf(d.due)
              const newWeek = lastWeek && week !== lastWeek
              lastWeek = week
              const date = new Date(d.due + 'T12:00:00')
              return (
                <button key={d.due} role="tab" aria-selected={d.due === day} className={`day-chip ${newWeek ? 'new-week' : ''} ${d.left === 0 ? 'clear' : ''}`}
                  onClick={() => setDay(d.due)} aria-label={`${formatDate(d.due, { weekday: 'long', day: 'numeric', month: 'long' })} : ${d.left} à faire`}>
                  <span className="dc-name">{date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="dc-num">{date.getDate()}</span>
                  <span className="dc-count">{d.left === 0 ? '✓' : d.left}</span>
                </button>
              )
            })}
          </div>

          <header className="day-head">
            <h2>{formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <span>{current ? (current.left === 0 ? 'Tout est fait' : `${current.left} à faire sur ${current.total}`) : ''}</span>
          </header>

          {list.length === 0 ? <Empty>Aucun devoir ce jour-là</Empty> : (
            <ul className="list" key={day}>
              {list.map((h) => (
                <li key={h.id} className={h.done ? 'done' : ''}>
                  <button className={`check ${h.done ? 'on' : ''}`} onClick={() => onCheck(h.id, h.due, h.done)}
                    aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} /></svg>
                  </button>
                  <div className="grow">
                    <strong>{h.subject}{h.test && <span className="status">Éval</span>}</strong>
                    <small className="clamp">{h.title}</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  )
}
