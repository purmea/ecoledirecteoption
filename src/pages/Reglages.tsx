import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'
import { Avatar, useMyProfile } from '../profile/useMyProfile'
import { timeAgo } from '../lib'

export type Theme = 'system' | 'light' | 'dark'
export type Accent = 'turquoise' | 'bleu' | 'vert' | 'orange' | 'rose' | 'graphite'

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'turquoise', label: 'Turquoise', color: '#00809a' },
  { id: 'bleu', label: 'Bleu', color: '#2a78d6' },
  { id: 'vert', label: 'Vert', color: '#17894f' },
  { id: 'orange', label: 'Orange', color: '#c9501a' },
  { id: 'rose', label: 'Rose', color: '#d23f78' },
  { id: 'graphite', label: 'Graphite', color: '#2c2c34' },
]

export function Reglages({ theme, setTheme, accent, setAccent }: { theme: Theme; setTheme: (t: Theme) => void; accent: Accent; setAccent: (a: Accent) => void }) {
  const { student } = useData()
  const { mode, refresh, refreshing, signOut, updatedAt } = useSession()
  const me = useMyProfile()
  return (
    <>
      <a href="#/profil" className="back"><Icon name="chevron" size={16} />Profil</a>
      <PageHeader title="Réglages" />
      <section className="profile">
        <Avatar profile={me} initials={`${student.firstName[0]}${student.lastName[0] ?? ''}`} size={48} />
        <div className="grow">
          <strong>{student.firstName} {student.lastName}</strong>
          <small>{[student.className, student.school].filter(Boolean).join(' · ')}</small>
        </div>
        {mode === 'demo' && <span className="tag">Démo</span>}
      </section>

      <SectionTitle>Apparence</SectionTitle>
      <Segmented label="Thème" value={theme} onChange={setTheme}
        options={[['system', 'Auto'], ['light', 'Clair'], ['dark', 'Sombre']] as const} />

      <SectionTitle>Couleur</SectionTitle>
      <div className="accents" role="radiogroup" aria-label="Couleur d’accent">
        {ACCENTS.map((a) => (
          <button key={a.id} role="radio" aria-checked={accent === a.id} className="accent-dot" onClick={() => setAccent(a.id)}>
            <span style={{ background: a.color }} />
            {a.label}
          </button>
        ))}
      </div>

      <SectionTitle>Compte</SectionTitle>
      <div className="list actions">
        <button className="row-action" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Actualisation…' : mode === 'demo' ? 'Réinitialiser la démo' : 'Actualiser les données'}
          {mode === 'live' && updatedAt && !refreshing && <small>Mis à jour {timeAgo(updatedAt)}</small>}
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
