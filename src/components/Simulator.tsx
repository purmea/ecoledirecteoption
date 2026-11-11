import { useState, type CSSProperties } from 'react'
import type { Grade } from '../types'
import { fmt, generalAverage, weightedAverage } from '../lib'
import { Segmented } from './ui'

/** « Et si j'avais… » : ajoute une note fictive et montre l'effet sur la moyenne générale. */
export function Simulator({ grades, subjects }: { grades: Grade[]; subjects: string[] }) {
  const [subject, setSubject] = useState(subjects[0] ?? '')
  const [value, setValue] = useState(15)
  const [coef, setCoef] = useState(1)
  const before = generalAverage(grades)
  if (before === null || !subjects.length) return null

  const fake: Grade = { id: 'sim', period: grades[0].period, subject: subject || subjects[0], label: 'Simulation', value, outOf: 20, coef, classAvg: null, date: '9999-12-31' }
  const after = generalAverage([...grades, fake])!
  const delta = after - before
  const name = fake.subject
  const subjBefore = weightedAverage(grades.filter((g) => g.subject === name))
  const subjAfter = weightedAverage([...grades, fake].filter((g) => g.subject === name))!
  const subjDelta = subjBefore === null ? null : subjAfter - subjBefore
  const tone = (d: number | null) => (d === null ? '' : d > 0.004 ? 'trend-up' : d < -0.004 ? 'trend-down' : '')
  const change = (d: number | null) => (d === null ? 'nouvelle' : Math.abs(d) < 0.005 ? 'inchangée' : `${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}`)

  return (
    <div className="sim">
      <div className="sim-row">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Matière">
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <Segmented label="Coefficient" value={String(coef)} onChange={(v) => setCoef(Number(v))}
          options={[['1', 'Coef 1'], ['2', 'Coef 2'], ['3', 'Coef 3']] as const} />
      </div>
      <div className="swap-in" key={`${subject}-${coef}`}>
      <label className="sim-slider">
        <span>Nouvelle note <strong>{fmt(value)}</strong>/20</span>
        <input type="range" className="range" min={0} max={20} step={0.5} value={value}
          onChange={(e) => setValue(Number(e.target.value))} style={{ '--p': `${(value / 20) * 100}%` } as CSSProperties} />
      </label>
      <p className="sim-result">
        Moyenne {name} : <strong>{fmt(subjAfter)}</strong>
        <span className={`sim-delta ${tone(subjDelta)}`}>{change(subjDelta)}</span>
      </p>
      <p className="sim-result">
        Moyenne générale : <strong>{fmt(after)}</strong>
        <span className={`sim-delta ${tone(delta)}`}>{change(delta)}</span>
      </p>
      </div>
    </div>
  )
}
