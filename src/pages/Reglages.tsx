import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle } from '../components/ui'
import { Icon } from '../components/Icon'
import { Avatar, useMyProfile } from '../profile/useMyProfile'
import { timeAgo } from '../lib'

export type Theme = 'marine' | 'nuit' | 'clair' | 'auto'
export type Accent = 'rouge' | 'turquoise' | 'bleu' | 'vert' | 'orange' | 'rose' | 'blanc'

const THEMES: { id: Theme; label: string; bg: string; fill: string; ink: string }[] = [
  { id: 'marine', label: 'Marine', bg: '#0a1a3a', fill: '#12285a', ink: '#f2f5ff' },
  { id: 'nuit', label: 'Nuit', bg: '#0f0f13', fill: '#1b1b22', ink: '#f1f1f5' },
  { id: 'clair', label: 'Clair', bg: '#f8f8fa', fill: '#eeeef3', ink: '#0d0d12' },
  { id: 'auto', label: 'Auto', bg: 'linear-gradient(135deg, #f8f8fa 50%, #0f0f13 50%)', fill: '#8884', ink: '#888' },
]

const ACCENTS: { id: Accent; label: string; color: string }[] = [
  { id: 'rouge', label: 'Rouge', color: '#ee2d46' },
  { id: 'turquoise', label: 'Turquoise', color: '#1ea3bd' },
  { id: 'bleu', label: 'Bleu', color: '#4b95ee' },
  { id: 'vert', label: 'Vert', color: '#22a56c' },
  { id: 'orange', label: 'Orange', color: '#e56a30' },
  { id: 'rose', label: 'Rose', color: '#e64a83' },
  { id: 'blanc', label: 'Blanc', color: '#f1f1f5' },
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

      <SectionTitle>Thème</SectionTitle>
      <div className="theme-tiles" role="radiogroup" aria-label="Thème">
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={theme === t.id} className="theme-tile" onClick={() => setTheme(t.id)}>
            <span style={{ background: t.bg }}>
              <i style={{ background: t.fill }} /><i style={{ background: t.fill, width: '40%' }} />
              <b style={{ background: 'var(--accent)' }} />
            </span>
            {t.label}
          </button>
        ))}
      </div>

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
