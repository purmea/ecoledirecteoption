import { useData, useSession } from '../state/session'
import { averageTimeline, fmt, formatDate, generalAverage, greeting, on20, todayIndex, DAYS } from '../lib'
import { Empty, SectionTitle } from '../components/ui'
import { Sparkline } from '../components/charts'

export function Accueil() {
  const { student, grades, lessons, homework, currentPeriod } = useData()
  const { mode } = useSession()
  const periodGrades = grades.filter((g) => g.period === currentPeriod)
  const avg = generalAverage(periodGrades)
  const trend = averageTimeline(periodGrades)
  const delta = trend.length > 1 ? trend[trend.length - 1].value - trend[trend.length - 2].value : null
  const day = todayIndex()
  const today = lessons.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start))
  const todo = homework.filter((h) => !h.done).sort((a, b) => a.due.localeCompare(b.due))
  const latest = [...grades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)
  const isWeekend = (new Date().getDay() + 6) % 7 > 4

  const summary = [
    `${today.filter((l) => !l.cancelled).length} cours`,
    `${todo.length} devoir${todo.length > 1 ? 's' : ''}`,
  ].join(' · ')

  return (
    <>
      <header className="page-header">
        <p className="eyebrow">
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {mode === 'demo' && <span className="tag">Démo</span>}
        </p>
        <h1>{greeting()} {student.firstName}</h1>
      </header>

      <a href="#/notes" className="hero">
        <div>
          <span className="eyebrow">Moyenne générale</span>
          <strong className="big">{avg !== null ? fmt(avg) : '—'}<small>/20</small></strong>
          {delta !== null && Math.abs(delta) >= 0.01 && (
            <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>
              {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))} depuis la dernière note
            </span>
          )}
        </div>
        <Sparkline points={trend} />
      </a>

      <SectionTitle meta={summary}>{isWeekend ? DAYS[day] : 'Aujourd’hui'}</SectionTitle>
      {today.length === 0 ? <Empty>Pas de cours</Empty> : (
        <ul className="list">
          {today.map((l) => (
            <li key={l.id} className={l.cancelled ? 'cancelled' : ''}>
              <span className="time">{l.start}</span>
              <div className="grow"><strong>{l.subject}</strong><small>{[l.room, l.teacher].filter(Boolean).join(' · ')}</small></div>
              {l.cancelled && <span className="status bad">Annulé</span>}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>Dernières notes</SectionTitle>
      {latest.length === 0 ? <Empty>Aucune note</Empty> : (
        <ul className="list">
          {latest.map((g) => (
            <li key={g.id}>
              <div className="grow"><strong>{g.subject}</strong><small>{g.label} · {formatDate(g.date)}</small></div>
              <span className={`score ${on20(g) < 10 ? 'low' : ''}`}>{fmt(g.value)}<small>/{g.outOf}</small></span>
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>À faire</SectionTitle>
      {todo.length === 0 ? <Empty>Tout est fait</Empty> : (
        <ul className="list">
          {todo.slice(0, 3).map((h) => (
            <li key={h.id}>
              <div className="grow">
                <strong>{h.subject}{h.test && <span className="status">Éval</span>}</strong>
                <small className="clamp">{h.title}</small>
              </div>
              <span className="muted small nowrap">{formatDate(h.due, { weekday: 'short', day: 'numeric' })}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
