import { siDiscord, siGithub, siInstagram, siPinterest, siSnapchat, siSoundcloud, siSpotify, siTelegram, siTiktok, siTwitch, siX, siYoutube } from 'simple-icons'
import type { LinkType } from './types'

type SimpleIcon = { path: string; hex: string; title: string }

export const LINKS: Record<LinkType, { label: string; icon?: SimpleIcon; placeholder: string; url: (v: string) => string | null }> = {
  instagram: { label: 'Instagram', icon: siInstagram, placeholder: 'pseudo', url: (v) => `https://instagram.com/${v.replace(/^@/, '')}` },
  tiktok: { label: 'TikTok', icon: siTiktok, placeholder: 'pseudo', url: (v) => `https://www.tiktok.com/@${v.replace(/^@/, '')}` },
  snapchat: { label: 'Snapchat', icon: siSnapchat, placeholder: 'pseudo', url: (v) => `https://www.snapchat.com/add/${v.replace(/^@/, '')}` },
  youtube: { label: 'YouTube', icon: siYoutube, placeholder: 'chaîne', url: (v) => `https://www.youtube.com/@${v.replace(/^@/, '')}` },
  x: { label: 'X', icon: siX, placeholder: 'pseudo', url: (v) => `https://x.com/${v.replace(/^@/, '')}` },
  discord: { label: 'Discord', icon: siDiscord, placeholder: 'pseudo', url: () => null },
  github: { label: 'GitHub', icon: siGithub, placeholder: 'pseudo', url: (v) => `https://github.com/${v}` },
  twitch: { label: 'Twitch', icon: siTwitch, placeholder: 'chaîne', url: (v) => `https://www.twitch.tv/${v}` },
  spotify: { label: 'Spotify', icon: siSpotify, placeholder: 'https://open.spotify.com/…', url: (v) => (v.startsWith('https://') ? v : null) },
  soundcloud: { label: 'SoundCloud', icon: siSoundcloud, placeholder: 'pseudo', url: (v) => `https://soundcloud.com/${v}` },
  pinterest: { label: 'Pinterest', icon: siPinterest, placeholder: 'pseudo', url: (v) => `https://www.pinterest.com/${v}` },
  telegram: { label: 'Telegram', icon: siTelegram, placeholder: 'pseudo', url: (v) => `https://t.me/${v.replace(/^@/, '')}` },
  website: { label: 'Site web', placeholder: 'https://…', url: (v) => (v.startsWith('https://') ? v : null) },
}

/** Couleur de marque lisible sur fond sombre (les logos noirs passent en blanc). */
export function brandColor(icon?: SimpleIcon) {
  if (!icon) return '#ffffff'
  const hex = icon.hex.toLowerCase()
  return ['000000', '181717', '1b1f23'].includes(hex) ? '#ffffff' : `#${hex}`
}

export function LinkIcon({ type, size = 22 }: { type: LinkType; size?: number }) {
  const icon = LINKS[type].icon
  if (!icon) {
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20" />
      </svg>
    )
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={icon.path} />
    </svg>
  )
}
