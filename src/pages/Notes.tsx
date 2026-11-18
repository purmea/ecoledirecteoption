import { useMemo, useState } from 'react'
import { useData } from '../state/session'
import { averageTimeline, fmt, generalAverage, groupBySubject, periodShort, weightedAverage } from '../lib'
import type { Grade } from '../types'
import { Sheet } from '../components/Sheet'
import { formatDate } from '../lib'
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
  const [openGrade, setOpenGrade] = useState<Grade | null>(null)
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
          <div className="gt">
            {subjects.map((s) => {
              const mine = sims.filter((g) => g.subject === s.subject)
              const rowAvg = mine.length ? weightedAverage([...s.items, ...mine]) : s.average
              return (
                <section key={s.subject} className="gt-row">
                  <header>
                    <h3>{s.subject}</h3>
                    {s.classAverage !== null && <small>classe {fmt(s.classAverage)}</small>}
                    <b className={`gt-avg ${mine.length ? 'gt-avg-sim' : ''} ${tone20(rowAvg)}`}>{rowAvg !== null ? fmt(rowAvg) : '—'}</b>
                  </header>
                  <div className="gt-notes">
                    {[...s.items].reverse().map((g) => (
                      <button key={g.id} className={`gt-note ${tone20(on20(g))}`} onClick={() => setOpenGrade(g)} aria-label={`${g.label} : ${fmt(g.value)} sur ${g.outOf}, coefficient ${g.coef}`}>
                        <span className="gt-v">{fmt(g.value)}{g.outOf !== 20 && <small>/{g.outOf}</small>}</span>
                        {g.coef !== 1 && <span className="gt-c">×{fmt(g.coef)}</span>}
                      </button>
                    ))}
                    {mine.map((g) => (
                      <button key={g.id} className="gt-note sim" onClick={() => setSims((l) => l.filter((x) => x.id !== g.id))}
                        aria-label={`Retirer la note simulée ${fmt(g.value)}`}>
                        <span className="gt-v">{fmt(g.value)}</span>{g.coef !== 1 && <span className="gt-c">×{fmt(g.coef)}</span>}
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
                  </div>
                </section>
              )
            })}
          </div>
          <Sheet open={!!openGrade} title="Détail de la note" onClose={() => setOpenGrade(null)}>
            {openGrade && <GradeDetail g={openGrade} all={list} />}
          </Sheet>

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

const on20 = (g: Grade) => (g.value / g.outOf) * 20
/** Couleur d'une note sur 20 : bien, moyen, à retravailler. */
const tone20 = (v: number | null) => (v === null ? '' : v >= 14 ? 'good' : v >= 10 ? 'mid' : 'low')

/** Détail d'une note : tout ce qu'affiche École Directe, plus son effet sur tes moyennes. */
function GradeDetail({ g, all }: { g: Grade; all: Grade[] }) {
  const v20 = on20(g)
  const subjectGrades = all.filter((x) => x.subject === g.subject)
  const without = subjectGrades.filter((x) => x.id !== g.id)
  const subjNow = weightedAverage(subjectGrades)
  const subjBefore = weightedAverage(without)
  const genNow = generalAverage(all)
  const genBefore = generalAverage(all.filter((x) => x.id !== g.id))
  const cls = g.classAvg
  const gap = cls !== null ? g.value - cls : null
  const min = g.classMin ?? null, max = g.classMax ?? null
  const pos = min !== null && max !== null && max > min ? Math.min(1, Math.max(0, (g.value - min) / (max - min))) : null
  const sorted = [...subjectGrades].sort((a, b) => on20(b) - on20(a))
  const rank = sorted.findIndex((x) => x.id === g.id) + 1
  const signed = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${fmt(Math.abs(d))}`
  const delta = (d: number | null) => d === null ? null : <em className={Math.abs(d) < 0.005 ? '' : d > 0 ? 'up' : 'down'}>{signed(d)}</em>

  return (
    <div className="gd">
      <p className="gd-subject">{g.subject}</p>
      <h2 className="sheet-title">{g.label}</h2>
      <p className="sheet-sub">{formatDate(g.date, { weekday: 'long', day: 'numeric', month: 'long' })}{g.type ? ` · ${g.type}` : ''}</p>

      <div className={`gd-hero ${tone20(v20)}`}>
        <strong>{fmt(g.value)}<small>/{g.outOf}</small></strong>
        <span>{g.outOf !== 20 ? `soit ${fmt(v20)}/20 · ` : ''}coef. {fmt(g.coef)}</span>
      </div>

      {cls !== null && (
        <div className="gd-class">
          <div className="gd-stats">
            <span><small>Moyenne classe</small><b>{fmt(cls)}</b></span>
            {min !== null && <span><small>Plus basse</small><b>{fmt(min)}</b></span>}
            {max !== null && <span><small>Plus haute</small><b>{fmt(max)}</b></span>}
          </div>
          {pos !== null && (
            <div className="gd-range" aria-hidden="true">
              <i style={{ left: `${((cls - min!) / (max! - min!)) * 100}%` }} className="avg" />
              <i style={{ left: `${pos * 100}%` }} className="me" />
            </div>
          )}
          {gap !== null && <p className="gd-gap">{Math.abs(gap) < 0.005 ? 'Pile dans la moyenne de la classe.' : `${signed(gap)} point${Math.abs(gap) >= 2 ? 's' : ''} ${gap > 0 ? 'au-dessus' : 'en dessous'} de la moyenne de la classe.`}</p>}
        </div>
      )}

      <ul className="gd-list">
        {subjNow !== null && <li><span>Moyenne en {g.subject}</span><b>{fmt(subjNow)}</b>{subjBefore !== null && delta(subjNow - subjBefore)}</li>}
        {genNow !== null && genBefore !== null && <li><span>Effet sur la moyenne générale</span><b>{fmt(genNow)}</b>{delta(genNow - genBefore)}</li>}
        {subjectGrades.length > 1 && <li><span>Classement parmi tes notes de {g.subject}</span><b>{rank}<small>/{subjectGrades.length}</small></b></li>}
        {g.enteredAt && g.enteredAt !== g.date && <li><span>Saisie le</span><b>{formatDate(g.enteredAt, { day: 'numeric', month: 'long' })}</b></li>}
      </ul>
      {g.comment && <p className="gd-comment">{g.comment}</p>}
    </div>
  )
}
