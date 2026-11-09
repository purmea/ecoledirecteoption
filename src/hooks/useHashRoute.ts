import { useEffect, useState } from 'react'

export type Route = 'accueil' | 'notes' | 'planning' | 'devoirs' | 'reglages'
const ROUTES: Route[] = ['accueil', 'notes', 'planning', 'devoirs', 'reglages']

const read = (): Route => {
  const h = location.hash.replace('#/', '') as Route
  return ROUTES.includes(h) ? h : 'accueil'
}

export function useHashRoute() {
  const [route, setRoute] = useState<Route>(read)
  useEffect(() => {
    const on = () => {
      setRoute(read())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}
