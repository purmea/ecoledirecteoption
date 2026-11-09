import { useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, fmt, formatDate, generalAverage, groupBySubject } from '../lib'
import { Card, Empty, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { SubjectBars, TrendChart } from '../components/charts'
import { Icon } from '../components/Icon'

export function Notes() {
  const { grades, periods, currentPeriod } = useData()
  const available = periods.filter((p) => grades.some((g) => g.period === p.code))
  const [period, setPeriod] = useState(available.some((p) => p.code === currentPeriod) ? currentPeriod : available.at(-1)?.code ?? '')
  const [open, setOpen] = useState<string | null>(null)

  const list = grades.filter((g) => g.period === period)
  const subjects = groupBySubject(list).sort((a, b) => a.subject.localeCompare(b.subject, 'fr'))
  const avg = generalAverage(list)
  const label = periods.find((p) => p.code === period)?.label ?? ''

  return (
    <>
      <PageHeader title="Notes" subtitle={label} />
      {available.length > 1 && (
        <Segmented label="Période" value={period} onChange={setPeriod}
          options={available.map((p) => [p.code, p.label.replace(/trimestre/i, 'trim.')] as const)} />
      )}

      {list.length === 0 ? <Card><Empty>Aucune note sur cette période</Empty></Card> : (
        <>
          <Card className="chart-card">
            <div className="chart-head">
              <div>
                <span className="eyebrow">Moyenne générale</span>
                <strong className="big">{avg !== null ? fmt(avg) : '—'}<small>/20</small></strong>
              </div>
            </div>
            <TrendChart points={averageTimeline(list)} label="Évolution de la moyenne générale" />
          </Card>

          <SectionTitle>Par matière</SectionTitle>
          <Card className="chart-card">
            <SubjectBars rows={subjects} />
          </Card>

          <SectionTitle>Détail</SectionTitle>
          <Card className="flush">
            <ul className="list accordion">
              {subjects.map((s) => {
                const isOpen = open === s.subject
                return (
                  <li key={s.subject}>
                    <button className="row-btn" onClick={() => setOpen(isOpen ? null : s.subject)} aria-expanded={isOpen}>
                      <div className="grow">
                        <strong>{s.subject}</strong>
                        <small>{s.items.length} note{s.items.length > 1 ? 's' : ''}{s.classAverage !== null ? ` · classe ${fmt(s.classAverage)}` : ''}</small>
                      </div>
                      <span className={`score ${s.average < 10 ? 'low' : ''}`}>{fmt(s.average)}</span>
                      <span className={`chev ${isOpen ? 'open' : ''}`}><Icon name="chevron" size={16} /></span>
                    </button>
                    {isOpen && (
                      <ul className="sub">
                        {s.items.map((g) => (
                          <li key={g.id}>
                            <div className="grow">
                              <span>{g.label}</span>
                              <small>{formatDate(g.date)} · coef {fmt(g.coef)}{g.classAvg !== null ? ` · classe ${fmt(g.classAvg)}` : ''}</small>
                            </div>
                            <span className="score">{fmt(g.value)}<small>/{g.outOf}</small></span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>
        </>
      )}
    </>
  )
}
