import { useState } from 'react'
import { grades } from '../data/demo'
import { colorOf, fmt, formatDate, groupBySubject, weightedAverage } from '../lib'
import { Card, PageHeader } from '../components/ui'
import { Icon } from '../components/Icon'

export function Notes() {
  const subjects = groupBySubject(grades).sort((a, b) => a.subject.localeCompare(b.subject))
  const avg = weightedAverage(grades)
  const [open, setOpen] = useState<string | null>(null)

  return (
    <>
      <PageHeader title="Notes" subtitle="1er trimestre" />
      <Card className="avg-card">
        <div>
          <span className="muted">Moyenne générale</span>
          <strong className="big">{avg ? fmt(avg) : '—'}<small>/20</small></strong>
        </div>
        <Ring value={avg ?? 0} />
      </Card>

      <div className="stack">
        {subjects.map((s) => {
          const isOpen = open === s.subject
          return (
            <Card key={s.subject} className="subject">
              <button className="subject-head" onClick={() => setOpen(isOpen ? null : s.subject)} aria-expanded={isOpen}>
                <span className="bar" style={{ background: colorOf(s.subject) }} />
                <div className="grow">
                  <strong>{s.subject}</strong>
                  <div className="progress" aria-hidden="true">
                    <span style={{ width: `${(s.average / 20) * 100}%`, background: colorOf(s.subject) }} />
                    <i style={{ left: `${(s.classAverage / 20) * 100}%` }} title="Moyenne de classe" />
                  </div>
                  <small className="muted">Classe : {fmt(s.classAverage)}</small>
                </div>
                <strong className="avg">{fmt(s.average)}</strong>
                <span className={`chev ${isOpen ? 'open' : ''}`}><Icon name="chevron" size={18} /></span>
              </button>
              {isOpen && (
                <ul className="list sub">
                  {s.items.map((g) => (
                    <li key={g.id}>
                      <div className="grow"><span>{g.label}</span><small>{formatDate(g.date)} · coef {g.coef} · classe {fmt(g.classAvg)}</small></div>
                      <strong>{fmt(g.value)}<small>/{g.outOf}</small></strong>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )
        })}
      </div>
    </>
  )
}

function Ring({ value }: { value: number }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg width="68" height="68" viewBox="0 0 68 68" aria-hidden="true">
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--line)" strokeWidth="7" />
      <circle cx="34" cy="34" r={r} fill="none" stroke="var(--accent)" strokeWidth="7" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - value / 20)} transform="rotate(-90 34 34)" />
    </svg>
  )
}
