import { useEffect } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { useLocalStorage } from './hooks/useLocalStorage'
import { SessionProvider, useSession } from './state/session'
import { BottomNav } from './components/BottomNav'
import { Accueil } from './pages/Accueil'
import { Notes } from './pages/Notes'
import { Planning } from './pages/Planning'
import { Devoirs } from './pages/Devoirs'
import { Login } from './pages/Login'
import { Profil } from './pages/Profil'
import { PublicProfile } from './pages/PublicProfile'
import { Reglages, type Theme } from './pages/Reglages'
import { buildSnapshot, getMyProfile, saveProfile } from './profile/api'

export default function App() {
  const [theme, setTheme] = useLocalStorage<Theme>('edo:theme', 'system')
  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  return (
    <SessionProvider>
      <Shell theme={theme} setTheme={setTheme} />
    </SessionProvider>
  )
}

function Shell({ theme, setTheme }: { theme: Theme; setTheme: (t: Theme) => void }) {
  const { status, data, error, mode } = useSession()
  const { route, param } = useHashRoute()

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
  if (status === 'loading' || !data) {
    return (
      <main className="loading" aria-busy="true">
        <div className="spinner" />
        <p className="muted">Chargement de tes données…</p>
      </main>
    )
  }

  const todo = data.homework.filter((h) => !h.done).length
  return (
    <div className="app">
      <main className="page" key={route}>
        {error && <p className="banner" role="alert">{error}</p>}
        {route === 'accueil' && <Accueil />}
        {route === 'notes' && <Notes />}
        {route === 'planning' && <Planning />}
        {route === 'devoirs' && <Devoirs />}
        {route === 'profil' && <Profil />}
        {route === 'reglages' && <Reglages theme={theme} setTheme={setTheme} />}
      </main>
      <BottomNav current={route} badge={todo} />
    </div>
  )
}
