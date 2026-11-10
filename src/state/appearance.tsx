import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

// Apparence de toute l'application (et de la page de profil, qui reprend ces couleurs).
// Deux choix indépendants : le FOND (thème) et la COULEUR d'accent, chacun avec une valeur « exacte » possible.

export type Theme = 'marine' | 'nuit' | 'clair' | 'auto' | 'perso'
export type Accent =
  | 'rouge' | 'orange' | 'jaune' | 'vert' | 'turquoise' | 'bleu' | 'violet' | 'rose' | 'blanc' | 'perso'

export interface Custom { bg: string; accent: string }

/** Fonds proposés. `bg` / `text` servent aussi à colorer la page de profil publique (doit rester aligné avec styles.css). */
export const THEMES: { id: Exclude<Theme, 'perso'>; label: string; bg: string; fill: string; text: string }[] = [
  { id: 'marine', label: 'Marine', bg: '#050c20', fill: '#0d1836', text: '#f0f4ff' },
  { id: 'nuit', label: 'Nuit', bg: '#08080b', fill: '#17171d', text: '#f1f1f5' },
  { id: 'clair', label: 'Clair', bg: '#f8f8fa', fill: '#eeeef3', text: '#0d0d12' },
  { id: 'auto', label: 'Auto', bg: 'linear-gradient(135deg, #f8f8fa 50%, #0f0f13 50%)', fill: '#8884', text: '#888' },
]

/** Couleurs d'accent : version pour fond clair (l) et pour fond sombre (d), contrastes validés. */
export const ACCENTS: { id: Exclude<Accent, 'perso'>; label: string; l: string; d: string }[] = [
  { id: 'rouge', label: 'Rouge', l: '#e5102e', d: '#ff2d46' },
  { id: 'orange', label: 'Orange', l: '#ee4a00', d: '#ff5a1f' },
  { id: 'jaune', label: 'Jaune', l: '#b07d00', d: '#ffc61a' },
  { id: 'vert', label: 'Vert', l: '#0a9d56', d: '#1fdb82' },
  { id: 'turquoise', label: 'Turquoise', l: '#008ea6', d: '#14d4e8' },
  { id: 'bleu', label: 'Bleu', l: '#1d6bff', d: '#3b86ff' },
  { id: 'violet', label: 'Violet', l: '#7b3ff2', d: '#9a5cff' },
  { id: 'rose', label: 'Rose', l: '#e0197f', d: '#ff3fa4' },
  { id: 'blanc', label: 'Blanc', l: '#1a1a22', d: '#ffffff' },
]

export const DEFAULT_CUSTOM: Custom = { bg: '#0a1230', accent: '#ff5a1f' }
export const isHex = (v: string) => /^#[0-9a-f]{6}$/i.test(v)

// --- calculs de couleur ------------------------------------------------------------------------

function luminance(hex: string) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
/** Texte sur une couleur : blanc si le contraste est correct pour du texte gras (≥ 3,5), sinon encre foncée. */
export const onColor = (hex: string) => (contrast('#ffffff', hex) >= 3.5 ? '#ffffff' : '#0f0f13')
const isDarkBg = (hex: string) => luminance(hex) < 0.18

/** Couleurs effectives (fond, texte, accent) pour un réglage donné : sert au rendu et à la page de profil. */
export function resolveColors(theme: Theme, accent: Accent, custom: Custom, systemDark: boolean) {
  const t = theme === 'perso' ? null : THEMES.find((x) => x.id === (theme === 'auto' ? (systemDark ? 'nuit' : 'clair') : theme))!
  const bg = t ? t.bg : custom.bg
  const text = t ? t.text : isDarkBg(custom.bg) ? '#f2f5ff' : '#0d0d12'
  const dark = isDarkBg(bg)
  const a = accent === 'perso' ? custom.accent : ACCENTS.find((x) => x.id === accent)![dark ? 'd' : 'l']
  return { bg, text, accent: a, dark }
}

// --- contexte ----------------------------------------------------------------------------------

interface Ctx {
  theme: Theme
  accent: Accent
  custom: Custom
  setTheme: (t: Theme) => void
  setAccent: (a: Accent) => void
  setCustom: (patch: Partial<Custom>) => void
  /** Couleurs réellement appliquées en ce moment. */
  colors: ReturnType<typeof resolveColors>
}
const AppearanceContext = createContext<Ctx | null>(null)

export function AppearanceProvider({ children }: { children: ReactNode }) {
  // Nouvelles clés : le nouveau défaut (fond noir + turquoise) s'applique à tout le monde.
  const [theme, setTheme] = useLocalStorage<Theme>('edo:theme3', 'nuit')
  const [accent, setAccent] = useLocalStorage<Accent>('edo:accent3', 'turquoise')
  const [custom, setCustomState] = useLocalStorage<Custom>('edo:custom', DEFAULT_CUSTOM)
  const systemDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches
  const colors = useMemo(() => resolveColors(theme, accent, custom, systemDark), [theme, accent, custom, systemDark])

  useEffect(() => {
    const root = document.documentElement
    // Fond
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    if (theme === 'perso') {
      root.style.setProperty('--bg', custom.bg)
      root.style.setProperty('--text', colors.text)
      root.dataset.tone = colors.dark ? 'dark' : 'light'
    } else {
      root.style.removeProperty('--bg')
      root.style.removeProperty('--text')
      delete root.dataset.tone
    }
    // Accent : ses valeurs sont toujours écrites ici (une seule source de vérité)
    const def = accent === 'perso' ? { l: custom.accent, d: custom.accent } : ACCENTS.find((x) => x.id === accent)!
    root.style.setProperty('--accent-l', def.l)
    root.style.setProperty('--accent-d', def.d)
    root.style.setProperty('--on-l', onColor(def.l))
    root.style.setProperty('--on-d', onColor(def.d))
    // Barre du navigateur (téléphone)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', colors.bg.startsWith('#') ? colors.bg : '#0f0f13')
  }, [theme, accent, custom, colors])

  const value = useMemo<Ctx>(() => ({
    theme, accent, custom, colors, setTheme, setAccent,
    setCustom: (patch) => setCustomState({ ...custom, ...patch }),
  }), [theme, accent, custom, colors, setTheme, setAccent, setCustomState])

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance() {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance doit être utilisé dans <AppearanceProvider>')
  return ctx
}
