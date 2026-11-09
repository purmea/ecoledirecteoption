import type { Route } from '../hooks/useHashRoute'
import { Icon, type IconName } from './Icon'
import { haptic } from '../fx'

const items: { route: Route; label: string; icon: IconName }[] = [
  { route: 'accueil', label: 'Accueil', icon: 'home' },
  { route: 'notes', label: 'Notes', icon: 'chart' },
  { route: 'planning', label: 'Planning', icon: 'calendar' },
  { route: 'devoirs', label: 'Devoirs', icon: 'book' },
  { route: 'profil', label: 'Profil', icon: 'user' },
]

export function BottomNav({ current, badge }: { current: Route; badge: number }) {
  return (
    <nav className="nav" aria-label="Navigation principale">
      {items.map((it) => (
        <a key={it.route} href={`#/${it.route}`} className="nav-item" onClick={() => haptic(6)}
          aria-current={current === it.route || (it.route === 'profil' && current === 'reglages') ? 'page' : undefined}>
          <span className="nav-icon">
            <Icon name={it.icon} />
            {it.route === 'devoirs' && badge > 0 && <span className="badge" role="img" aria-label={`${badge} à faire`} />}
          </span>
          <span>{it.label}</span>
        </a>
      ))}
    </nav>
  )
}
