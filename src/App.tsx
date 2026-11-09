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
import { Reglages, type Theme } from './pages/Reglages'

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
  const { status, data, error } = useSession()
  const route = useHashRoute()

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
        {route === 'reglages' && <Reglages theme={theme} setTheme={setTheme} />}
      </main>
      <BottomNav current={route} badge={todo} />
    </div>
  )
}
