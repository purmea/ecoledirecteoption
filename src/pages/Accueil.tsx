import { useData, useSession } from '../state/session'
import { averageTimeline, fmt, formatDate, generalAverage, greeting, on20 } from '../lib'
import { Empty, SectionTitle } from '../components/ui'
import { Sparkline } from '../components/charts'
import { Avatar, useMyProfile } from '../profile/useMyProfile'
import { NowCard } from '../components/NowCard'
import { CountUp } from '../fx'

export function Accueil() {
  const { student, grades, lessons, homework, currentPeriod } = useData()
  const { mode } = useSession()
  const me = useMyProfile()
  const periodGrades = grades.filter((g) => g.period === currentPeriod)
  const avg = generalAverage(periodGrades)
  const trend = averageTimeline(periodGrades)
  const delta = trend.length > 1 ? trend[trend.length - 1].value - trend[trend.length - 2].value : null
  const todo = homework.filter((h) => !h.done).sort((a, b) => a.due.localeCompare(b.due))
  const latest = [...grades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)


  return (
    <>
      <header className="page-header home-head">
        <div>
          <p className="eyebrow">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {mode === 'demo' && <span className="tag">Démo</span>}
          </p>
          <h1>{greeting()} {student.firstName}</h1>
        </div>
        <a href="#/profil" aria-label="Mon profil"><Avatar profile={me} initials={`${student.firstName[0]}${student.lastName[0] ?? ''}`} size={44} /></a>
      </header>

      <a href="#/notes" className="hero">
        <div>
          <span className="eyebrow">Moyenne générale</span>
          <strong className="big">{avg !== null ? <CountUp value={avg} /> : '—'}<small>/20</small></strong>
          {delta !== null && Math.abs(delta) >= 0.01 && (
            <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>
              {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))} depuis la dernière note
            </span>
          )}
        </div>
        <Sparkline points={trend} />
      </a>

      <NowCard lessons={lessons} />

      <SectionTitle meta={<a href="#/notes" className="link">Tout voir</a>}>Dernières notes</SectionTitle>
      {latest.length === 0 ? <Empty>Aucune note</Empty> : (
        <div className="notes-row">
          {latest.map((g) => (
            <a href="#/notes" key={g.id} className={`note-tile ${on20(g) < 10 ? 'low' : ''}`} aria-label={`${g.subject} : ${fmt(g.value)} sur ${g.outOf}`}>
              <strong>{fmt(g.value)}<small>/{g.outOf}</small></strong>
              <span className="note-subject">{g.subject}</span>
              <small>{formatDate(g.date)}</small>
            </a>
          ))}
        </div>
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
