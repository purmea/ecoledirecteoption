import { useEffect, useState } from 'react'

export type Route = 'accueil' | 'notes' | 'planning' | 'devoirs' | 'messages' | 'reglages'
const ROUTES: Route[] = ['accueil', 'notes', 'planning', 'devoirs', 'messages', 'reglages']

export interface Location { route: Route; param?: string }

const read = (): Location => {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/')
  if (name === 'profil') return { route: 'reglages' }
  if (name === 'messages' && param) return { route: 'messages', param: decodeURIComponent(param) }
  if (name === 'planning' && param) return { route: 'planning', param: decodeURIComponent(param) }
  return { route: ROUTES.includes(name as Route) ? (name as Route) : 'accueil' }
}

export function useHashRoute() {
  const [loc, setLoc] = useState<Location>(read)
  useEffect(() => {
    const on = () => {
      setLoc(read())
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return loc
}
