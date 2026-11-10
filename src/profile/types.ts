export type WidgetType = 'average' | 'subject' | 'trend' | 'subjects' | 'homework'
export type BgEffect = 'none' | 'halos' | 'rain' | 'snow' | 'stars' | 'particles'
export type NameEffect = 'none' | 'rainbow' | 'typewriter' | 'glitch' | 'sparkles'

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
  colors: { accent: string; text: string; background: string; icons: string }
  effects: { background: BgEffect; username: NameEffect }
  opacity: number // 0–100, opacité des blocs (widgets, badges)
  blur: number // 0–80 px, flou derrière les blocs
  glow: { username: boolean; badges: boolean; widgets: boolean }
  options: {
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
  /** Visible par tout le monde (sinon privé : seul le propriétaire le voit). */
  public: boolean
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
  public: false,
  colors: { accent: '#ffffff', text: '#ffffff', background: '#0a0a0a', icons: '#ffffff' },
  effects: { background: 'none', username: 'none' },
  opacity: 7,
  blur: 8,
  glow: { username: true, badges: true, widgets: false },
  options: {
    animatedTitle: false, animatedBio: true, invertBlocks: false, volumeControl: true, showBadges: true,
    discordAvatar: false, discordDecoration: false, discordPresence: false,
  },
  discordId: '',
}

/** Complète un profil (ancien format ou incomplet) avec les valeurs par défaut. */
export function withDefaults(p: Partial<Profile>): Profile {
  return {
    ...DEFAULTS,
    ...p,
    colors: { ...DEFAULTS.colors, ...p.colors },
    effects: { ...DEFAULTS.effects, ...p.effects },
    glow: { ...DEFAULTS.glow, ...p.glow },
    options: { ...DEFAULTS.options, ...p.options },
    widgets: p.widgets ?? [],
  } as Profile
}

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
