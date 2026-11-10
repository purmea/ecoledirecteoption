import { useEffect } from 'react'
import { Icon, type IconName } from './Icon'
import { homeworkForTomorrow } from '../lib'
import { useMessages, useSession } from '../state/session'

const items: { route: string; label: string; icon: IconName }[] = [
  { route: 'accueil', label: 'Accueil', icon: 'home' },
  { route: 'notes', label: 'Notes', icon: 'chart' },
  { route: 'planning', label: 'Emploi du temps', icon: 'calendar' },
  { route: 'devoirs', label: 'Devoirs', icon: 'book' },
  { route: 'messages', label: 'Messages', icon: 'mail' },
  { route: 'profil', label: 'Profil', icon: 'user' },
]

/** Menu qui glisse depuis la gauche (ouvert par les trois traits) : remplace la barre du bas sur l'emploi du temps. */
export function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data } = useSession()
  const unread = useMessages().filter((m) => !m.read && !m.archived).length
  const todo = homeworkForTomorrow(data?.homework ?? [])
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  return (
    <div className={`drawer ${open ? 'open' : ''}`} aria-hidden={!open}>
      <div className="drawer-backdrop" onClick={onClose} />
      <nav className="drawer-panel" aria-label="Menu" inert={!open}>
        <p className="drawer-title">{data ? `${data.student.firstName} ${data.student.lastName}` : 'Menu'}</p>
        {items.map((it) => {
          const n = it.route === 'messages' ? unread : it.route === 'devoirs' ? todo : 0
          return (
            <a key={it.route} href={`#/${it.route}`} onClick={onClose} aria-current={it.route === 'planning' ? 'page' : undefined}>
              <Icon name={it.icon} size={22} /><span>{it.label}</span>{n > 0 && <em>{n}</em>}
            </a>
          )
        })}
      </nav>
    </div>
  )
}
