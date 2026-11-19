import { useData, useSession } from '../state/session'
import { averageTimeline, fmt, formatDate, generalAverage, greeting } from '../lib'
import { Empty, SectionTitle } from '../components/ui'
import { Sparkline } from '../components/charts'
import { Avatar, useMyProfile } from '../profile/useMyProfile'
import { displayedMonday, isoDate } from '../api/ecoledirecte'
import { NowCard } from '../components/NowCard'
import { CountUp } from '../fx'
import { useHomeworkCheck } from '../hooks/useHomeworkCheck'

const KIND = { absence: 'Absence', retard: 'Retard', punition: 'Punition', sanction: 'Sanction', exclusion: 'Exclusion' } as const

export function Accueil() {
  const { student, grades, lessons, homework, currentPeriod, incidents = [] } = useData()
  const { mode, applyPlan } = useSession()
  const me = useMyProfile()
  const onCheck = useHomeworkCheck()
  const periodGrades = grades.filter((g) => g.period === currentPeriod)
  const avg = generalAverage(periodGrades)
  const trend = averageTimeline(periodGrades)
  const delta = trend.length > 1 ? trend[trend.length - 1].value - trend[trend.length - 2].value : null
  const todo = homework.filter((h) => !h.done).sort((a, b) => a.due.localeCompare(b.due))
  const unjustified = incidents.filter((i) => (i.kind === 'absence' || i.kind === 'retard') && !i.justified).length
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
            <span className="delta">
              {delta > 0 ? '+' : '−'}{fmt(Math.abs(delta))} depuis la dernière note
            </span>
          )}
        </div>
        <Sparkline points={trend} />
      </a>

      <NowCard lessons={applyPlan(lessons, isoDate(displayedMonday()))} />

      <SectionTitle meta={<a href="#/notes" className="link">Tout voir</a>}>Dernières notes</SectionTitle>
      {latest.length === 0 ? <Empty>Aucune note</Empty> : (
        <div className="notes-row">
          {latest.map((g) => (
            <a href="#/notes" key={g.id} className="note-tile" aria-label={`${g.subject} : ${fmt(g.value)} sur ${g.outOf}`}>
              <strong>{fmt(g.value)}<small>/{g.outOf}</small></strong>
              <span className="note-subject">{g.subject}</span>
              <small>{formatDate(g.date)}</small>
            </a>
          ))}
        </div>
      )}

      <SectionTitle meta={<a href="#/devoirs" className="link">Tout voir</a>}>À faire</SectionTitle>
      {todo.length === 0 ? <Empty>Tout est fait</Empty> : (
        <ul className="list todo">
          {todo.slice(0, 3).map((h) => (
            <li key={h.id}>
              <button className="check" onClick={() => onCheck(h.id, h.due, h.done)} aria-label="Marquer comme fait" aria-pressed={false}>
                <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} /></svg>
              </button>
              <a href="#/devoirs" className="todo-link">
                <div className="grow">
                  <strong>{h.subject}{h.test && <span className="status">Éval</span>}</strong>
                  <small className="clamp">{h.title}</small>
                </div>
                <span className="muted small nowrap">{formatDate(h.due, { weekday: 'short', day: 'numeric' })}</span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {incidents.length > 0 && (
        <>
          <SectionTitle meta={unjustified > 0 ? <span className="status bad">{unjustified} non justifiée{unjustified > 1 ? 's' : ''}</span> : undefined}>Vie scolaire</SectionTitle>
          <ul className="list">
            {incidents.slice(0, 4).map((i) => (
              <li key={i.id}>
                <div className="grow">
                  <strong>{KIND[i.kind]}{(i.kind === 'absence' || i.kind === 'retard') && (
                    <span className={`status ${i.justified ? '' : 'bad'}`}>{i.justified ? 'Justifiée' : 'Non justifiée'}</span>
                  )}</strong>
                  <small className="clamp">{[i.label, i.detail].filter(Boolean).join(' · ') || '—'}</small>
                </div>
                <span className="muted small nowrap">{formatDate(i.date, { day: 'numeric', month: 'short' })}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  )
}
