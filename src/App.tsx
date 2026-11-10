import { useEffect, useRef, useState } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { useLocalStorage } from './hooks/useLocalStorage'
import { SessionProvider, useMessages, useSession } from './state/session'
import { BottomNav } from './components/BottomNav'
import { Confetti, Toaster, toast } from './fx'
import { Skeleton } from './components/Skeleton'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { Accueil } from './pages/Accueil'
import { Notes } from './pages/Notes'
import { Planning } from './pages/Planning'
import { Devoirs } from './pages/Devoirs'
import { Login } from './pages/Login'
import { MessageView, Messages } from './pages/Messages'
import { Profil } from './pages/Profil'
import { PublicProfile } from './pages/PublicProfile'
import { Reglages, type Accent, type Theme } from './pages/Reglages'
import { buildSnapshot, getMyProfile, saveProfile } from './profile/api'

export default function App() {
  // Nouvelles clés : le thème par défaut est désormais « marine » avec l'accent rouge.
  const [theme, setTheme] = useLocalStorage<Theme>('edo:theme2', 'marine')
  const [accent, setAccent] = useLocalStorage<Accent>('edo:accent2', 'rouge')
  useEffect(() => {
    const root = document.documentElement
    if (theme === 'auto') delete root.dataset.theme
    else root.dataset.theme = theme
    if (accent === 'rouge') delete root.dataset.accent
    else root.dataset.accent = accent
    // La barre du navigateur (téléphone) prend la couleur du fond.
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', getComputedStyle(root).getPropertyValue('--bg').trim() || '#0a1a3a')
  }, [theme, accent])

  return (
    <SessionProvider>
      <Shell theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />
    </SessionProvider>
  )
}

function Shell({ theme, setTheme, accent, setAccent }: { theme: Theme; setTheme: (t: Theme) => void; accent: Accent; setAccent: (a: Accent) => void }) {
  const { status, data, error, mode, refresh } = useSession()
  const { route, param } = useHashRoute()
  const messages = useMessages()
  const order = ['accueil', 'notes', 'planning', 'devoirs', 'messages', 'profil', 'reglages']
  const idx = Math.max(0, order.indexOf(route))
  const prevIdx = useRef(idx)
  const dir = idx === prevIdx.current ? 0 : idx > prevIdx.current ? 1 : -1
  useEffect(() => { prevIdx.current = idx }, [idx])

  // Barre de titre compacte (façon iOS) : apparaît quand le grand titre a défilé hors de l'écran.
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 64)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  const titles: Record<string, string> = { accueil: 'Accueil', notes: 'Notes', planning: 'Emploi du temps', devoirs: 'Devoirs', messages: 'Messages', profil: 'Profil', reglages: 'Réglages' }

  const ptr = usePullToRefresh(async () => { await refresh(); toast('Données à jour') }, mode === 'live' && status === 'ready')

  // Compte réel : à chaque chargement des données, on rafraîchit les moyennes du profil public.
  useEffect(() => {
    if (mode !== 'live' || !data) return
    const snapshot = buildSnapshot(data)
    getMyProfile('live')
      .then((p) => p && JSON.stringify({ ...p.snapshot, updatedAt: null }) !== JSON.stringify({ ...snapshot, updatedAt: null })
        ? saveProfile('live', { ...p, snapshot }) : null)
      .catch(() => { /* serveur sans profils ou session non liée : rien à faire */ })
  }, [mode, data])

  // Le profil public se consulte sans être connecté.
  if (route === 'u' && param) return <PublicProfile handle={param} />

  if (status === 'signed-out') return <Login />
  if (status === 'loading' || !data) return <Skeleton />

  const todo = data.homework.filter((h) => !h.done).length
  const unread = messages.filter((m) => !m.read && !m.archived).length
  return (
    <div className="app">
      <div className={`ptr ${ptr.busy ? 'busy' : ''} ${ptr.ready ? 'ready' : ''}`} style={{ transform: `translateY(${ptr.pull - 44}px)`, opacity: Math.min(1, ptr.pull / 50) }} aria-hidden="true">
        <span className="ptr-spin" style={{ transform: ptr.busy ? undefined : `rotate(${ptr.pull * 5}deg)` }} />
      </div>
      <div className={`topbar ${scrolled ? 'on' : ''}`} aria-hidden="true"><span>{titles[route]}</span></div>
      <main className="page" key={route} data-dir={dir}
        style={ptr.pull > 0 ? { transform: `translateY(${ptr.pull * 0.35}px)` } : undefined}>
        {error && <p className="banner" role="alert">{error}</p>}
        {route === 'accueil' && <Accueil />}
        {route === 'notes' && <Notes />}
        {route === 'planning' && <Planning />}
        {route === 'devoirs' && <Devoirs />}
        {route === 'messages' && (param ? <MessageView id={param} key={param} /> : <Messages />)}
        {route === 'profil' && <Profil />}
        {route === 'reglages' && <Reglages theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} />}
      </main>
      <BottomNav current={route} badges={{ devoirs: todo, messages: unread }} />
      <Toaster />
      <Confetti />
    </div>
  )
}
