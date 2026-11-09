import { useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, generalAverage, groupBySubject } from '../lib'
import { Empty, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { SubjectBars, TrendChart } from '../components/charts'
import { Simulator } from '../components/Simulator'
import { CountUp } from '../fx'

export function Notes() {
  const { grades, periods, currentPeriod } = useData()
  const available = periods.filter((p) => grades.some((g) => g.period === p.code))
  const [period, setPeriod] = useState(available.some((p) => p.code === currentPeriod) ? currentPeriod : available.at(-1)?.code ?? '')

  const list = grades.filter((g) => g.period === period)
  const subjects = groupBySubject(list).sort((a, b) => a.subject.localeCompare(b.subject, 'fr'))
  const avg = generalAverage(list)
  const label = periods.find((p) => p.code === period)?.label ?? ''

  return (
    <>
      <PageHeader title="Notes" subtitle={available.length > 1 ? undefined : label} />
      {available.length > 1 && (
        <Segmented label="Période" value={period} onChange={setPeriod}
          options={available.map((p) => [p.code, p.label.replace(/trimestre/i, 'trim.')] as const)} />
      )}

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
