import { useEffect, useState } from 'react'
import { getPublicProfile } from '../profile/api'
import { ProfileView } from '../profile/ProfileCard'
import type { Profile } from '../profile/types'
import { Icon } from '../components/Icon'

const Exit = () => <a href="#/accueil" className="pf-exit"><Icon name="chevron" size={16} />Quitter</a>

export function PublicProfile({ handle }: { handle: string }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setProfile(null)
    setError(null)
    getPublicProfile(handle.toLowerCase())
      .then((p) => alive && setProfile(p))
      .catch((e) => alive && setError(e.status === 404 ? 'Ce profil n’existe pas.' : e.message))
    return () => { alive = false }
  }, [handle])

  if (profile) return <><ProfileView profile={profile} /><Exit /></>
  return (
    <main className="pf-page pf-loading">
      <div className="pf-empty">{error ?? <span className="spinner light" />}</div>
      <Exit />
    </main>
  )
}
