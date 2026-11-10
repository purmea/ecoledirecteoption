import { useMemo, useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, fmt, generalAverage, groupBySubject, periodShort } from '../lib'
import { Empty, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { SubjectBars, TrendChart } from '../components/charts'
import { Simulator } from '../components/Simulator'
import { CountUp } from '../fx'

const ALL = 'all'

export function Notes() {
  const { grades, periods: apiPeriods, currentPeriod } = useData()
  // Périodes de l'établissement (trimestres, semestres…). Sans information, on les déduit des notes.
  const periods = useMemo(() => apiPeriods.length ? apiPeriods
    : [...new Set(grades.map((g) => g.period))].sort().map((code, i) => ({ code, label: `Période ${i + 1}`, start: '', end: '' })), [apiPeriods, grades])
  const options = [
    ...periods.map((p) => [p.code, periodShort(p.label)] as const),
    ...(periods.length > 1 ? [[ALL, 'Année'] as const] : []),
  ]
  const [period, setPeriod] = useState(periods.some((p) => p.code === currentPeriod) ? currentPeriod : periods.at(-1)?.code ?? ALL)

  const list = period === ALL ? grades : grades.filter((g) => g.period === period)
  const subjects = groupBySubject(list).sort((a, b) => a.subject.localeCompare(b.subject, 'fr'))
  const avg = generalAverage(list)
  const timeline = averageTimeline(list)
  // Évolution de la moyenne avec la dernière note : vert si elle monte, rouge si elle baisse (onglet Notes uniquement).
  const delta = timeline.length > 1 ? timeline[timeline.length - 1].value - timeline[timeline.length - 2].value : null
  const tone = delta === null || Math.abs(delta) < 0.005 ? undefined : delta > 0 ? 'up' : 'down'
  const raw = period === ALL ? 'Toute l’année' : periods.find((p) => p.code === period)?.label ?? ''
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)

  return (
    <>
      <PageHeader title="Notes" subtitle={label} />
      {options.length > 1 && <Segmented label="Période" value={period} onChange={setPeriod} options={options} />}

      {list.length === 0 ? <Empty>Aucune note sur cette période</Empty> : (
        <div className="swap-in" key={period}>
          <section className="block">
            <span className="eyebrow">Moyenne générale</span>
            <strong className={`big ${tone ? `trend-${tone}` : ''}`}>{avg !== null ? <CountUp value={avg} /> : '—'}<small>/20</small></strong>
            {delta !== null && tone && (
              <span className={`trend-note trend-${tone}`}>
                <i aria-hidden="true">{tone === 'up' ? '▲' : '▼'}</i>{tone === 'up' ? '+' : '−'}{fmt(Math.abs(delta))} depuis la dernière note
              </span>
            )}
            <TrendChart points={timeline} label="Évolution de la moyenne générale" tone={tone} />
          </section>

          <SectionTitle meta={
            subjects.some((s) => s.classAverage !== null) && (
              <span className="legend" aria-hidden="true">
                <span><i className="key-bar" />Toi</span>
                <span><i className="key-tick" />Classe</span>
              </span>
            )
          }>Matières</SectionTitle>
          <SubjectBars subjects={subjects} />

          <SectionTitle>Simulateur</SectionTitle>
          <Simulator grades={list} subjects={subjects.map((x) => x.subject)} />
        </div>
      )}
    </>
  )
}
