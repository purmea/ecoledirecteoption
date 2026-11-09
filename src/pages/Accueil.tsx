import { grades, lessons, student, type Homework } from '../data/demo'
import { DAYS, fmt, formatDate, greeting, on20, todayIndex, weightedAverage } from '../lib'
import { Card, Empty, SectionTitle, SubjectDot } from '../components/ui'
import { Icon } from '../components/Icon'

export function Accueil({ homework }: { homework: Homework[] }) {
  const avg = weightedAverage(grades)
  const day = todayIndex()
  const today = lessons.filter((l) => l.day === day)
  const todo = homework.filter((h) => !h.done).sort((a, b) => a.due.localeCompare(b.due))
  const latest = [...grades].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)

  return (
    <>
      <header className="hero">
        <p className="hero-sub">{greeting()},</p>
        <h1>{student.firstName} 👋</h1>
        <p className="hero-sub">{student.className} · {student.school}</p>
        <div className="stats">
          <div className="stat"><strong>{avg ? fmt(avg) : '—'}</strong><span>Moyenne</span></div>
          <div className="stat"><strong>{today.filter((l) => !l.cancelled).length}</strong><span>Cours {DAYS[day].toLowerCase()}</span></div>
          <div className="stat"><strong>{todo.length}</strong><span>Devoirs</span></div>
        </div>
      </header>

      <SectionTitle action={<a href="#/planning" className="link">Tout voir</a>}>{DAYS[day]}</SectionTitle>
      <Card>
        {today.length === 0 ? <Empty>Pas de cours 🎉</Empty> : (
          <ul className="list">
            {today.map((l) => (
              <li key={l.id} className={l.cancelled ? 'cancelled' : ''}>
                <SubjectDot subject={l.subject} />
                <div className="grow">
                  <strong>{l.subject}</strong>
                  <small>{l.room} · {l.teacher}</small>
                </div>
                <span className="muted time"><Icon name="clock" size={14} /> {l.start}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SectionTitle action={<a href="#/notes" className="link">Tout voir</a>}>Dernières notes</SectionTitle>
      <Card>
        <ul className="list">
          {latest.map((g) => (
            <li key={g.id}>
              <SubjectDot subject={g.subject} />
              <div className="grow"><strong>{g.subject}</strong><small>{g.label} · {formatDate(g.date)}</small></div>
              <span className={`pill ${on20(g) >= 10 ? 'good' : 'bad'}`}>{fmt(g.value)}/{g.outOf}</span>
            </li>
          ))}
        </ul>
      </Card>

      <SectionTitle action={<a href="#/devoirs" className="link">Tout voir</a>}>À faire</SectionTitle>
      <Card>
        {todo.length === 0 ? <Empty>Tout est fait ✅</Empty> : (
          <ul className="list">
            {todo.slice(0, 3).map((h) => (
              <li key={h.id}>
                <SubjectDot subject={h.subject} />
                <div className="grow"><strong>{h.title}</strong><small>{h.subject}</small></div>
                <span className="muted">{formatDate(h.due, { weekday: 'short', day: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
