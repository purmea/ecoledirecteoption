export type WidgetType = 'average' | 'subject' | 'trend' | 'subjects' | 'homework'
export type BgEffect = 'none' | 'halos' | 'rain' | 'snow' | 'stars' | 'particles'
export type NameEffect = 'none' | 'rainbow' | 'typewriter' | 'glitch' | 'sparkles'
export type LinkType = 'instagram' | 'tiktok' | 'snapchat' | 'youtube' | 'x' | 'discord' | 'github' | 'twitch' | 'spotify' | 'soundcloud' | 'pinterest' | 'telegram' | 'website'

export interface Widget {
  id: string
  type: WidgetType
  subject?: string
}

/** Données figées au moment de la publication, affichées par les widgets du profil public. */
export interface Snapshot {
  period: string
  average: number | null
  trend: number[]
  subjects: { subject: string; average: number; classAverage: number | null }[]
  homeworkLeft: number | null
  updatedAt?: string
}

export interface Profile {
  handle: string
  displayName: string
  bio: string
  location: string
  /** Texte de l'écran d'entrée (affiché quand il y a de la musique). */
  enterText: string
  avatar: string | null
  background: { url: string; type: 'image' | 'video' } | null
  audio: string | null
  cursor: string | null
  links: { type: LinkType; value: string }[]
  colors: { accent: string; text: string; background: string; icons: string }
  effects: { background: BgEffect; username: NameEffect }
  opacity: number // 0–100, opacité des blocs (widgets, badges)
  blur: number // 0–80 px, flou derrière les blocs
  glow: { username: boolean; icons: boolean; badges: boolean; widgets: boolean }
  options: {
    monoIcons: boolean
    animatedTitle: boolean
    animatedBio: boolean
    invertBlocks: boolean
    volumeControl: boolean
    showBadges: boolean
    discordAvatar: boolean
    discordDecoration: boolean
    discordPresence: boolean
  }
  discordId: string
  widgets: Widget[]
  snapshot: Snapshot
  views?: number
  createdAt?: string
}

export const DEFAULTS: Omit<Profile, 'handle' | 'displayName' | 'snapshot' | 'widgets'> = {
  bio: '',
  location: '',
  enterText: 'clique pour entrer',
  avatar: null,
  background: null,
  audio: null,
  cursor: null,
  links: [],
  colors: { accent: '#ffffff', text: '#ffffff', background: '#0a0a0a', icons: '#ffffff' },
  effects: { background: 'none', username: 'none' },
  opacity: 7,
  blur: 8,
  glow: { username: true, icons: true, badges: true, widgets: false },
  options: {
    monoIcons: true, animatedTitle: false, animatedBio: true, invertBlocks: false, volumeControl: true, showBadges: true,
    discordAvatar: false, discordDecoration: false, discordPresence: false,
  },
  discordId: '',
}

/** Complète un profil (ancien format ou incomplet) avec les valeurs par défaut. */
export function withDefaults(p: Partial<Profile> & { theme?: string }): Profile {
  const legacy = PALETTES.find((x) => x.id === p.theme)
  return {
    ...DEFAULTS,
    ...p,
    colors: { ...DEFAULTS.colors, ...(legacy ? legacy.colors : {}), ...p.colors },
    effects: { ...DEFAULTS.effects, ...p.effects },
    glow: { ...DEFAULTS.glow, ...p.glow },
    options: { ...DEFAULTS.options, ...p.options },
    links: p.links ?? [],
    widgets: p.widgets ?? [],
  } as Profile
}

/** Palettes rapides (remplissent les 4 couleurs d'un coup). */
export const PALETTES: { id: string; label: string; colors: Profile['colors'] }[] = [
  { id: 'clean', label: 'Clean', colors: { accent: '#ffffff', text: '#ffffff', background: '#0a0a0a', icons: '#ffffff' } },
  { id: 'aurora', label: 'Aurore', colors: { accent: '#b7a8ff', text: '#f5f3ff', background: '#0a0716', icons: '#c9bdff' } },
  { id: 'ocean', label: 'Océan', colors: { accent: '#7cc4ff', text: '#eaf4ff', background: '#030b18', icons: '#9fd3ff' } },
  { id: 'sunset', label: 'Couchant', colors: { accent: '#ff8a65', text: '#fff1ec', background: '#12060c', icons: '#ffb199' } },
  { id: 'forest', label: 'Forêt', colors: { accent: '#8fe3a8', text: '#ecfff4', background: '#04100a', icons: '#b2efc4' } },
]

export const WIDGETS: { type: WidgetType; label: string; hint: string }[] = [
  { type: 'average', label: 'Moyenne générale', hint: 'Ta moyenne du trimestre en grand' },
  { type: 'trend', label: 'Évolution', hint: 'La courbe de ta moyenne' },
  { type: 'subjects', label: 'Meilleures matières', hint: 'Tes 3 meilleures moyennes' },
  { type: 'subject', label: 'Une matière', hint: 'La moyenne d’une matière au choix' },
  { type: 'homework', label: 'Devoirs restants', hint: 'Combien il t’en reste à faire' },
]

export const BG_EFFECTS: { id: BgEffect; label: string }[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'halos', label: 'Halos' },
  { id: 'rain', label: 'Pluie' },
  { id: 'snow', label: 'Neige' },
  { id: 'stars', label: 'Étoiles' },
  { id: 'particles', label: 'Particules' },
]

export const NAME_EFFECTS: { id: NameEffect; label: string }[] = [
  { id: 'none', label: 'Aucun' },
  { id: 'rainbow', label: 'Arc-en-ciel' },
  { id: 'typewriter', label: 'Machine à écrire' },
  { id: 'glitch', label: 'Glitch' },
  { id: 'sparkles', label: 'Étincelles' },
]
