// Données Discord publiques via Lanyard (https://github.com/Phineas/lanyard).
// La personne doit avoir rejoint le serveur Discord de Lanyard pour que son profil y soit visible.
import { useEffect, useState } from 'react'

export interface DiscordInfo {
  name: string
  avatarUrl: string | null
  decorationUrl: string | null
  status: 'online' | 'idle' | 'dnd' | 'offline'
  activity: string | null
}

interface LanyardData {
  discord_user: { id: string; username: string; global_name?: string | null; avatar: string | null; avatar_decoration_data?: { asset: string } | null }
  discord_status: DiscordInfo['status']
  listening_to_spotify?: boolean
  spotify?: { song: string; artist: string } | null
  activities?: { type: number; name: string; state?: string; details?: string }[]
}

function toInfo(d: LanyardData): DiscordInfo {
  const u = d.discord_user
  const ext = u.avatar?.startsWith('a_') ? 'gif' : 'png'
  const custom = d.activities?.find((a) => a.type === 4)?.state
  const playing = d.activities?.find((a) => a.type === 0)
  return {
    name: u.global_name || u.username,
    avatarUrl: u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.${ext}?size=256` : null,
    decorationUrl: u.avatar_decoration_data?.asset
      ? `https://cdn.discordapp.com/avatar-decoration-presets/${u.avatar_decoration_data.asset}.png?size=240&passthrough=true` : null,
    status: d.discord_status,
    activity: d.listening_to_spotify && d.spotify ? `Écoute ${d.spotify.song} — ${d.spotify.artist}`
      : playing ? `Joue à ${playing.name}` : custom ?? null,
  }
}

/** Récupère avatar, décoration et présence Discord (rafraîchi toutes les 30 s). */
export function useDiscord(id: string, enabled: boolean) {
  const [info, setInfo] = useState<DiscordInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!enabled || !/^\d{15,21}$/.test(id)) {
      setInfo(null)
      return
    }
    let alive = true
    const load = async () => {
      try {
        const r = await fetch(`https://api.lanyard.rest/v1/users/${id}`)
        const j = await r.json()
        if (!alive) return
        if (j.success) { setInfo(toInfo(j.data)); setError(null) }
        else setError('Profil Discord introuvable sur Lanyard (rejoins discord.gg/lanyard).')
      } catch {
        if (alive) setError('Discord injoignable pour le moment.')
      }
    }
    void load()
    const t = setInterval(load, 30_000)
    return () => { alive = false; clearInterval(t) }
  }, [id, enabled])
  return { info, error }
}
