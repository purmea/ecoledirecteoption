import { useState, type CSSProperties } from 'react'
import type { Grade } from '../types'
import { fmt, generalAverage } from '../lib'

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

  return (
    <div className="sim">
      <div className="sim-row">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Matière">
          {subjects.map((s) => <option key={s}>{s}</option>)}
        </select>
        <div className="sim-coef" role="group" aria-label="Coefficient">
          {[1, 2, 3].map((c) => (
            <button key={c} aria-pressed={coef === c} onClick={() => setCoef(c)}>Coef {c}</button>
          ))}
        </div>
      </div>
      <div className="sim-weight" aria-hidden="true" style={{ '--w': coef / 3 } as CSSProperties}>
        <span>Poids de la note</span>
        <i><b /></i>
        <em key={coef}>{Math.round((coef / (coef + 3)) * 100)} %</em>
      </div>
      <label className="sim-slider">
        <span>Si j’avais <strong>{fmt(value)}</strong>/20</span>
        <input type="range" className="range" min={0} max={20} step={0.5} value={value}
          onChange={(e) => setValue(Number(e.target.value))} style={{ '--p': `${(value / 20) * 100}%` } as CSSProperties} />
      </label>
      <p className="sim-result">
        Moyenne générale : <strong key={`${coef}-${value}-${subject}`} className="pop">{fmt(after)}</strong>
        <span key={`d${coef}-${value}-${subject}`} className={`sim-delta pop ${delta > 0.004 ? 'trend-up' : delta < -0.004 ? 'trend-down' : ''}`}>
          {Math.abs(delta) < 0.005 ? 'inchangée' : `${delta > 0 ? '+' : '−'}${fmt(Math.abs(delta))}`}
        </span>
      </p>
    </div>
  )
}
