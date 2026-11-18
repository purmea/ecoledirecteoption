import { useEffect, useRef, useState } from 'react'
import { useHashRoute } from './hooks/useHashRoute'
import { SessionProvider, useMessages, useSession } from './state/session'
import { BottomNav } from './components/BottomNav'
import { Confetti, Toaster, toast } from './fx'
import { homeworkForTomorrow } from './lib'
import { Skeleton } from './components/Skeleton'
import { usePullToRefresh } from './hooks/usePullToRefresh'
import { Accueil } from './pages/Accueil'
import { Notes } from './pages/Notes'
import { Planning } from './pages/Planning'
import { Devoirs } from './pages/Devoirs'
import { Login } from './pages/Login'
import { MessageView, Messages } from './pages/Messages'
import { Reglages } from './pages/Reglages'
import { AppearanceProvider } from './state/appearance'

export default function App() {
  return (
    <AppearanceProvider>
      <SessionProvider>
        <Shell />
      </SessionProvider>
    </AppearanceProvider>
  )
}

function Shell() {
  const { status, data, error, mode, refresh } = useSession()
  const { route, param } = useHashRoute()
  const messages = useMessages()
  const order = ['accueil', 'notes', 'planning', 'devoirs', 'messages', 'reglages']
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
  const titles: Record<string, string> = { accueil: 'Accueil', notes: 'Notes', planning: 'Emploi du temps', devoirs: 'Devoirs', messages: 'Messages', reglages: 'Réglages' }

  const ptr = usePullToRefresh(async () => { await refresh(); toast('Données à jour') }, mode === 'live' && status === 'ready')

  if (status === 'signed-out') return <Login />
  if (status === 'loading' || !data) return <Skeleton />

  const todo = homeworkForTomorrow(data.homework)
  const unread = messages.filter((m) => !m.read && !m.archived).length
  return (
    <div className="app">
      <div className={`ptr ${ptr.busy ? 'busy' : ''} ${ptr.ready ? 'ready' : ''}`} style={{ transform: `translateY(${ptr.pull - 44}px)`, opacity: Math.min(1, ptr.pull / 50) }} aria-hidden="true">
        <span className="ptr-spin" style={{ transform: ptr.busy ? undefined : `rotate(${ptr.pull * 5}deg)` }} />
      </div>
      <div className={`topbar ${scrolled ? 'on' : ''}`} aria-hidden="true"><span>{titles[route]}</span></div>
      {route === 'planning' ? <Planning /> : (
      <main className="page" key={route} data-dir={dir}
        style={ptr.pull > 0 ? { transform: `translateY(${ptr.pull * 0.35}px)` } : undefined}>
        {error && <p className="banner" role="alert">{error}</p>}
        {route === 'accueil' && <Accueil />}
        {route === 'notes' && <Notes />}
        {route === 'devoirs' && <Devoirs />}
        {route === 'messages' && (param ? <MessageView id={param} key={param} /> : <Messages />)}
        {route === 'reglages' && <Reglages />}
      </main>
      )}
      {route !== 'planning' && <BottomNav current={route} badges={{ devoirs: todo, messages: unread }} />}
      <Toaster />
      <Confetti />
    </div>
  )
}
