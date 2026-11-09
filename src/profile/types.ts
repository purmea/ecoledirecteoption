export type ProfileTheme = 'aurora' | 'ocean' | 'sunset' | 'forest' | 'mono'
export type WidgetType = 'average' | 'subject' | 'trend' | 'subjects' | 'homework'

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
  avatar: string | null
  theme: ProfileTheme
  widgets: Widget[]
  snapshot: Snapshot
  views?: number
}

export const THEMES: { id: ProfileTheme; label: string; colors: [string, string, string] }[] = [
  { id: 'aurora', label: 'Aurore', colors: ['#6d5bff', '#2a78d6', '#19c3b2'] },
  { id: 'ocean', label: 'Océan', colors: ['#0b4f9c', '#2a78d6', '#7cc4ff'] },
  { id: 'sunset', label: 'Couchant', colors: ['#ff6a3d', '#e3366f', '#7a3ce0'] },
  { id: 'forest', label: 'Forêt', colors: ['#0f5c3d', '#1f9d63', '#b7e36b'] },
  { id: 'mono', label: 'Mono', colors: ['#3a3a3a', '#8a8a8a', '#e8e8e8'] },
]

export const WIDGETS: { type: WidgetType; label: string; hint: string }[] = [
  { type: 'average', label: 'Moyenne générale', hint: 'Ta moyenne du trimestre en grand' },
  { type: 'trend', label: 'Évolution', hint: 'La courbe de ta moyenne' },
  { type: 'subjects', label: 'Meilleures matières', hint: 'Tes 3 meilleures moyennes' },
  { type: 'subject', label: 'Une matière', hint: 'La moyenne d’une matière au choix' },
  { type: 'homework', label: 'Devoirs restants', hint: 'Combien il t’en reste à faire' },
]
