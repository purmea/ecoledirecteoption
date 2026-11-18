import { useMemo, useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, fmt, generalAverage, groupBySubject, periodShort, weightedAverage } from '../lib'
import type { Grade } from '../types'
import { Empty, PageHeader, SectionTitle, Segmented } from '../components/ui'
import { SubjectBars, TrendChart } from '../components/charts'
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

  const [sims, setSims] = useState<Grade[]>([])
  const [adding, setAdding] = useState<string | null>(null)
  const [draft, setDraft] = useState({ value: '', coef: '1' })
  const list = period === ALL ? grades : grades.filter((g) => g.period === period)
  const subjects = groupBySubject(list).sort((a, b) => a.subject.localeCompare(b.subject, 'fr'))
  const avg = generalAverage(list)
  const simAvg = sims.length ? generalAverage([...list, ...sims]) : null
  const timeline = averageTimeline(list)
  // Évolution de la moyenne avec la dernière note : vert si elle monte, rouge si elle baisse (onglet Notes uniquement).
  const delta = timeline.length > 1 ? timeline[timeline.length - 1].value - timeline[timeline.length - 2].value : null
  const tone = delta === null || Math.abs(delta) < 0.005 ? undefined : delta > 0 ? 'up' : 'down'
  const raw = period === ALL ? 'Toute l’année' : periods.find((p) => p.code === period)?.label ?? ''
  const label = raw.charAt(0).toUpperCase() + raw.slice(1)

  return (
    <>
      <PageHeader title="Notes" subtitle={label} />
      {options.length > 1 && <Segmented label="Période" value={period} onChange={(v) => { setPeriod(v); setSims([]); setAdding(null) }} options={options} />}

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

          <SectionTitle meta={sims.length > 0 && (
            <span className="gt-sim-avg">Moyenne simulée <b>{simAvg !== null ? fmt(simAvg) : '—'}</b>
              <button className="gt-reset" onClick={() => setSims([])} aria-label="Effacer les simulations">Effacer</button></span>
          )}>Toutes les notes</SectionTitle>
          <div className="block grades-table-wrap">
            <table className="grades-table">
              <thead><tr><th scope="col">Matière</th><th scope="col">Moy.</th><th scope="col">Notes</th></tr></thead>
              <tbody>
                {subjects.map((s) => {
                  const mine = sims.filter((g) => g.subject === s.subject)
                  const rowAvg = mine.length ? weightedAverage([...s.items, ...mine]) : s.average
                  return (
                  <tr key={s.subject}>
                    <th scope="row">{s.subject}</th>
                    <td className={`gt-avg ${mine.length ? 'gt-avg-sim' : ''}`}>{rowAvg !== null ? fmt(rowAvg) : '—'}</td>
                    <td>
                      <span className="gt-notes">
                        {[...s.items].reverse().map((g) => (
                          <span key={g.id} className="gt-note" title={`${g.label} · ${g.date}`}>
                            {fmt(g.value)}{g.outOf !== 20 && <small>/{g.outOf}</small>}{g.coef !== 1 && <sup>({g.coef})</sup>}
                          </span>
                        ))}
                        {mine.map((g) => (
                          <button key={g.id} className="gt-note sim" onClick={() => setSims((l) => l.filter((x) => x.id !== g.id))}
                            aria-label={`Retirer la note simulée ${fmt(g.value)}`}>
                            {fmt(g.value)}{g.coef !== 1 && <sup>({g.coef})</sup>}
                          </button>
                        ))}
                        {adding === s.subject ? (
                          <form className="gt-add-form" onSubmit={(e) => {
                            e.preventDefault()
                            const v = Number(draft.value.replace(',', '.')), c = Number(draft.coef.replace(',', '.')) || 1
                            if (!Number.isFinite(v) || v < 0 || v > 20) return
                            setSims((l) => [...l, { id: `sim-${Date.now()}`, period: period === ALL ? '' : period, subject: s.subject, label: 'Simulation', value: v, outOf: 20, coef: c, classAvg: null, date: new Date().toISOString() }])
                            setAdding(null)
                            setDraft({ value: '', coef: '1' })
                          }}>
                            <input autoFocus inputMode="decimal" placeholder="/20" aria-label="Note sur 20" value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
                            <input inputMode="decimal" aria-label="Coefficient" className="coef" value={draft.coef} onChange={(e) => setDraft({ ...draft, coef: e.target.value })} />
                            <button type="submit" aria-label="Ajouter">✓</button>
                            <button type="button" onClick={() => setAdding(null)} aria-label="Annuler">✕</button>
                          </form>
                        ) : (
                          <button className="gt-add" onClick={() => setAdding(s.subject)} aria-label={`Simuler une note en ${s.subject}`}>+</button>
                        )}
                      </span>
                    </td>
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <SectionTitle meta={
            subjects.some((s) => s.classAverage !== null) && (
              <span className="legend" aria-hidden="true">
                <span><i className="key-bar" />Toi</span>
                <span><i className="key-tick" />Classe</span>
              </span>
            )
          }>Matières</SectionTitle>
          <SubjectBars subjects={subjects} />

        </div>
      )}
    </>
  )
}
