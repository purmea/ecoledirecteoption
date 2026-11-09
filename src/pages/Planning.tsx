import { useEffect, useState } from 'react'
import { useData } from '../state/session'
import { DAYS, todayIndex } from '../lib'
import { Empty, PageHeader, Segmented } from '../components/ui'

const nowHHMM = () => new Date().toTimeString().slice(0, 5)

export function Planning() {
  const { lessons } = useData()
  const [day, setDay] = useState(todayIndex())
  const [now, setNow] = useState(nowHHMM)
  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 30_000)
    return () => clearInterval(t)
  }, [])
  const isToday = day === (new Date().getDay() + 6) % 7
  const list = lessons.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <>
      <PageHeader title="Emploi du temps" subtitle="Cette semaine" />
      <Segmented label="Jour" value={String(day)} onChange={(v) => setDay(Number(v))}
        options={DAYS.map((d, i) => [String(i), d.slice(0, 3)] as const)} />
      {list.length === 0 ? <Empty>Aucun cours</Empty> : (
        <ol className="timeline">
          {list.map((l) => {
            const current = isToday && !l.cancelled && l.start <= now && now < l.end
            return (
              <li key={l.id} className={`${l.cancelled ? 'cancelled' : ''} ${current ? 'current' : ''}`}>
                <div className="tl-time"><strong>{l.start}</strong><small>{l.end}</small></div>
                <div className="tl-card">
                  <div className="grow">
                    <strong>{l.subject}</strong>
                    <small>{[l.room, l.teacher].filter(Boolean).join(' · ')}</small>
                  </div>
                  {l.cancelled && <span className="pill bad">Annulé</span>}
                  {current && <span className="pill accent">En cours</span>}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </>
  )
}
