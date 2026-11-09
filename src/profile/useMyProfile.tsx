import { useEffect, useState } from 'react'
import { useSession } from '../state/session'
import { getMyProfile } from './api'
import type { Profile } from './types'

export const PROFILE_CHANGED = 'edo:profile-changed'
let cache: { mode: string; profile: Profile | null } | null = null

/** Profil public de l'utilisateur (pour afficher sa photo ailleurs dans l'app). */
export function useMyProfile() {
  const { mode } = useSession()
  const [profile, setProfile] = useState<Profile | null>(cache && cache.mode === mode ? cache.profile : null)
  useEffect(() => {
    if (!mode) return
    let alive = true
    const load = () => getMyProfile(mode)
      .then((p) => { cache = { mode, profile: p }; if (alive) setProfile(p) })
      .catch(() => { /* pas de serveur de profils : on garde les initiales */ })
    void load()
    window.addEventListener(PROFILE_CHANGED, load)
    return () => { alive = false; window.removeEventListener(PROFILE_CHANGED, load) }
  }, [mode])
  return profile
}

export function Avatar({ profile, initials, size = 40 }: { profile: Profile | null; initials: string; size?: number }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.36 }}>
      {profile?.avatar ? <img src={profile.avatar} alt="" /> : initials}
    </span>
  )
}
