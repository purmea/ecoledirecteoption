import { useData, useSession } from '../state/session'
import { Card, PageHeader, SectionTitle, Segmented } from '../components/ui'

export type Theme = 'system' | 'light' | 'dark'

export function Reglages({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { student } = useData()
  const { mode, refresh, refreshing, signOut } = useSession()
  return (
    <>
      <PageHeader title="Réglages" />
      <Card className="profile">
        <div className="avatar">{student.firstName[0]}{student.lastName[0]}</div>
        <div className="grow">
          <strong>{student.firstName} {student.lastName}</strong>
          <small>{[student.className, student.school].filter(Boolean).join(' · ')}</small>
        </div>
        <span className="tag">{mode === 'demo' ? 'Démo' : 'Connecté'}</span>
      </Card>

      <SectionTitle>Apparence</SectionTitle>
      <Segmented label="Thème" value={theme} onChange={setTheme}
        options={[['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as const} />

      <SectionTitle>Compte</SectionTitle>
      <Card className="actions">
        <button className="row-action" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Actualisation…' : mode === 'demo' ? 'Réinitialiser la démo' : 'Actualiser les données'}
        </button>
        <button className="row-action danger" onClick={signOut}>
          {mode === 'demo' ? 'Quitter la démo' : 'Se déconnecter'}
        </button>
      </Card>

      <p className="footer muted small">
        EcoleDirecte Option v{__APP_VERSION__} · projet non officiel, sans lien avec Aplim.
      </p>
    </>
  )
}
