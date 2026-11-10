import type { CSSProperties } from 'react'
import type { Route } from '../hooks/useHashRoute'
import { Icon, type IconName } from './Icon'
import { haptic } from '../fx'

const items: { route: Route; label: string; icon: IconName }[] = [
  { route: 'accueil', label: 'Accueil', icon: 'home' },
  { route: 'notes', label: 'Notes', icon: 'chart' },
  { route: 'planning', label: 'Planning', icon: 'calendar' },
  { route: 'devoirs', label: 'Devoirs', icon: 'book' },
  { route: 'messages', label: 'Messages', icon: 'mail' },
  { route: 'profil', label: 'Profil', icon: 'user' },
]

export function BottomNav({ current, badges }: { current: Route; badges: Partial<Record<Route, number>> }) {
  const active = Math.max(0, items.findIndex((it) => it.route === current || (it.route === 'profil' && current === 'reglages')))
  return (
    <nav className="nav" aria-label="Navigation principale" style={{ '--n': items.length, '--i': active } as CSSProperties}>
      <span className="nav-pill" aria-hidden="true" />
      {items.map((it) => (
        <a key={it.route} href={`#/${it.route}`} className="nav-item" onClick={() => haptic(6)}
          aria-current={current === it.route || (it.route === 'profil' && current === 'reglages') ? 'page' : undefined}>
          <span className="nav-icon">
            <Icon name={it.icon} />
            {(badges[it.route] ?? 0) > 0 && (it.route === 'devoirs'
              ? <span className="badge count" role="img" aria-label={`${badges[it.route]} devoir${badges[it.route]! > 1 ? 's' : ''} à faire pour demain`}>{badges[it.route]}</span>
              : <span className="badge" role="img" aria-label={`${badges[it.route]} non lus`} />)}
          </span>
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  )
}
