import { useState } from 'react'
import { lessons } from '../data/demo'
import { DAYS, colorOf, todayIndex } from '../lib'
import { Empty, PageHeader } from '../components/ui'

export function Planning() {
  const [day, setDay] = useState(todayIndex())
  const list = lessons.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <>
      <PageHeader title="Emploi du temps" subtitle="Semaine en cours" />
      <div className="tabs" role="tablist">
        {DAYS.map((d, i) => (
          <button key={d} role="tab" aria-selected={i === day} onClick={() => setDay(i)}>
            {d.slice(0, 3)}
          </button>
        ))}
      </div>
      {list.length === 0 ? <Empty>Aucun cours</Empty> : (
        <ol className="timeline">
          {list.map((l) => (
            <li key={l.id} className={l.cancelled ? 'cancelled' : ''}>
              <div className="tl-time"><strong>{l.start}</strong><small>{l.end}</small></div>
              <div className="tl-card" style={{ borderLeftColor: colorOf(l.subject) }}>
                <strong>{l.subject}</strong>
                <small>{l.room} · {l.teacher}</small>
                {l.cancelled && <span className="pill bad">Annulé</span>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
