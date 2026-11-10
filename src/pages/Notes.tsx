import { useMemo, useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, generalAverage, groupBySubject, periodShort } from '../lib'
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
  const raw = period === ALL ? 'Toute l’année' : periods.find((p) => p.code === period)?.label ?? ''
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)

  return (
    <>
      <PageHeader title="Notes" subtitle={label} />
      {options.length > 1 && <Segmented label="Période" value={period} onChange={setPeriod} options={options} />}

      {list.length === 0 ? <Empty>Aucune note sur cette période</Empty> : (
        <>
          <section className="block">
            <span className="eyebrow">Moyenne générale</span>
            <strong className="big">{avg !== null ? <CountUp value={avg} /> : '—'}<small>/20</small></strong>
            <TrendChart points={averageTimeline(list)} label="Évolution de la moyenne générale" />
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
          <Simulator key={period} grades={list} subjects={subjects.map((x) => x.subject)} />
        </>
      )}
    </>
  )
}
