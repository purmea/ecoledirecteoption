import { student } from '../data/demo'
import { Card, PageHeader, SectionTitle } from '../components/ui'

export type Theme = 'system' | 'light' | 'dark'

export function Reglages({ theme, setTheme, onReset }: { theme: Theme; setTheme: (t: Theme) => void; onReset: () => void }) {
  return (
    <>
      <PageHeader title="Réglages" />
      <Card className="profile">
        <div className="avatar">{student.firstName[0]}{student.lastName[0]}</div>
        <div>
          <strong>{student.firstName} {student.lastName}</strong>
          <small className="muted">{student.className} · {student.school}</small>
        </div>
      </Card>

      <SectionTitle>Apparence</SectionTitle>
      <div className="tabs" role="radiogroup" aria-label="Thème">
        {([['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as const).map(([k, label]) => (
          <button key={k} role="radio" aria-checked={theme === k} aria-selected={theme === k} onClick={() => setTheme(k)}>{label}</button>
        ))}
      </div>

      <SectionTitle>Données</SectionTitle>
      <Card>
        <p className="muted small">
          Cette version utilise des <strong>données de démonstration</strong>. La connexion au compte
          École Directe arrivera dans une prochaine version.
        </p>
        <button className="btn" onClick={onReset}>Réinitialiser les devoirs</button>
      </Card>

      <p className="footer muted small">EcoleDirecte Option v{__APP_VERSION__} · projet non officiel</p>
    </>
  )
}
