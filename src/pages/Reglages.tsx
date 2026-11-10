import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle } from '../components/ui'
import { Icon } from '../components/Icon'
import { Avatar, useMyProfile } from '../profile/useMyProfile'
import { timeAgo } from '../lib'

export function Reglages() {
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

      <a href="#/profil" className="row-link"><span className="grow">Thème et couleurs</span><Icon name="chevron" size={16} /></a>

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
