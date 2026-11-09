import { useEffect, useState } from 'react'
import { getPublicProfile } from '../profile/api'
import { ProfileBackdrop, ProfileCard } from '../profile/ProfileCard'
import type { Profile } from '../profile/types'

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

  useEffect(() => {
    const prev = document.title
    if (profile) document.title = `@${profile.handle} · EcoleDirecte Option`
    return () => { document.title = prev }
  }, [profile])

  return (
    <main className="pf-page">
      <ProfileBackdrop theme={profile?.theme ?? 'aurora'} />
      {profile ? <ProfileCard profile={profile} /> : (
        <div className="pf-card pf-empty">{error ?? <span className="spinner light" />}</div>
      )}
      <a href="#/" className="pf-brand">EcoleDirecte Option</a>
    </main>
  )
}
