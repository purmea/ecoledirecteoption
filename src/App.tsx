import { useEffect } from 'react'
import { homework as demoHomework, type Homework } from './data/demo'
import { useHashRoute } from './hooks/useHashRoute'
import { useLocalStorage } from './hooks/useLocalStorage'
import { BottomNav } from './components/BottomNav'
import { Accueil } from './pages/Accueil'
import { Notes } from './pages/Notes'
import { Planning } from './pages/Planning'
import { Devoirs } from './pages/Devoirs'
import { Reglages, type Theme } from './pages/Reglages'

export default function App() {
  const route = useHashRoute()
  const [theme, setTheme] = useLocalStorage<Theme>('edo:theme', 'system')
  const [homework, setHomework] = useLocalStorage<Homework[]>('edo:homework', demoHomework)

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = theme
  }, [theme])

  const toggle = (id: string) => setHomework((hs) => hs.map((h) => (h.id === id ? { ...h, done: !h.done } : h)))
  const todo = homework.filter((h) => !h.done).length

  return (
    <div className="app">
      <main className="page" key={route}>
        {route === 'accueil' && <Accueil homework={homework} />}
        {route === 'notes' && <Notes />}
        {route === 'planning' && <Planning />}
        {route === 'devoirs' && <Devoirs homework={homework} onToggle={toggle} />}
        {route === 'reglages' && <Reglages theme={theme} setTheme={setTheme} onReset={() => setHomework(demoHomework)} />}
      </main>
      <BottomNav current={route} badge={todo} />
    </div>
  )
}
