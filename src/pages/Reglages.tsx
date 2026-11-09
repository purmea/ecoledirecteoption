import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'

export type Theme = 'system' | 'light' | 'dark'

export function Reglages({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { student } = useData()
  const { mode, refresh, refreshing, signOut } = useSession()
  return (
    <>
      <a href="#/profil" className="back"><Icon name="chevron" size={16} />Profil</a>
      <PageHeader title="Réglages" />
      <section className="profile">
        <div className="avatar">{student.firstName[0]}{student.lastName[0]}</div>
        <div className="grow">
          <strong>{student.firstName} {student.lastName}</strong>
          <small>{[student.className, student.school].filter(Boolean).join(' · ')}</small>
        </div>
        {mode === 'demo' && <span className="tag">Démo</span>}
      </section>

      <SectionTitle>Apparence</SectionTitle>
      <Segmented label="Thème" value={theme} onChange={setTheme}
        options={[['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as const} />

      <SectionTitle>Compte</SectionTitle>
      <div className="list actions">
        <button className="row-action" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Actualisation…' : mode === 'demo' ? 'Réinitialiser la démo' : 'Actualiser les données'}
        </button>
        <button className="row-action danger" onClick={signOut}>
          {mode === 'demo' ? 'Quitter la démo' : 'Se déconnecter'}
        </button>
      </div>

      <p className="footer muted small">
        EcoleDirecte Option v{__APP_VERSION__} · projet non officiel, sans lien avec Aplim.
      </p>
    </>
  )
}
