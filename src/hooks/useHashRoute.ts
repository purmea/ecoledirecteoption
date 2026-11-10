import { useEffect, useState } from 'react'

export type Route = 'accueil' | 'notes' | 'planning' | 'devoirs' | 'messages' | 'profil' | 'reglages' | 'u'
const ROUTES: Route[] = ['accueil', 'notes', 'planning', 'devoirs', 'messages', 'profil', 'reglages', 'u']

export interface Location { route: Route; param?: string }

const read = (): Location => {
  const [name, param] = location.hash.replace(/^#\/?/, '').split('/')
  if (name === 'u' && param) return { route: 'u', param: decodeURIComponent(param) }
  if (name === 'messages' && param) return { route: 'messages', param: decodeURIComponent(param) }
  return { route: ROUTES.includes(name as Route) && name !== 'u' ? (name as Route) : 'accueil' }
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
