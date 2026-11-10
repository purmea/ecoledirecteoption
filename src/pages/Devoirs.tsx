import { useRef, useState } from 'react'
import { useData, useSession } from '../state/session'
import type { Homework } from '../types'
import { formatDate } from '../lib'
import { Empty, PageHeader, Segmented } from '../components/ui'
import { celebrate, haptic, toast } from '../fx'

type Filter = 'todo' | 'done' | 'all'

export function Devoirs() {
  const { homework } = useData()
  const { toggleHomework } = useSession()
  const [filter, setFilter] = useState<Filter>('todo')
  // Un devoir qu'on vient de cocher reste un instant à sa place (coche qui se dessine),
  // puis se replie, au lieu de disparaître d'un coup.
  const [holding, setHolding] = useState<Record<string, 'show' | 'leave'>>({})
  const timers = useRef<number[]>([])
  const matches = (h: Homework) => (filter === 'all' ? true : filter === 'done' ? h.done : !h.done)
  const list = homework
    .filter((h) => matches(h) || holding[h.id])
    .sort((a, b) => a.due.localeCompare(b.due))
  const doneCount = homework.filter((h) => h.done).length

  const onCheck = (id: string, wasDone: boolean) => {
    haptic()
    toggleHomework(id)
    const target = homework.find((h) => h.id === id)
    if (target && filter !== 'all' && matches(target)) {
      // il va quitter la liste : on le garde le temps de l'animation
      setHolding((x) => ({ ...x, [id]: 'show' }))
      timers.current.push(
        window.setTimeout(() => setHolding((x) => ({ ...x, [id]: 'leave' })), 650),
        window.setTimeout(() => setHolding((x) => { const { [id]: _, ...rest } = x; return rest }), 1100),
      )
    }
    if (wasDone) return
    const left = homework.filter((h) => !h.done).length - 1
    if (left === 0) {
      celebrate()
      toast('Tout est fait, bravo !', 'party')
    } else toast(`Fait · plus que ${left}`)
  }

  const groups = new Map<string, typeof list>()
  for (const h of list) groups.set(h.due, [...(groups.get(h.due) ?? []), h])

  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount} sur ${homework.length} terminés`} />
      <Segmented label="Filtre" value={filter} onChange={setFilter}
        options={[['todo', 'À faire'], ['done', 'Faits'], ['all', 'Tous']] as const} />
      {list.length === 0 ? <Empty>Rien ici</Empty> : (
        [...groups].map(([due, items]) => (
          <section key={due}>
            <h2 className="group-title">{formatDate(due, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <ul className="list">
              {items.map((h) => (
                <li key={h.id} className={`${h.done ? 'done' : ''} ${holding[h.id] === 'leave' ? 'leaving' : ''}`}>
                  <button className={`check ${h.done ? 'on' : ''}`} onClick={() => onCheck(h.id, h.done)}
                    aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} /></svg>
                  </button>
                  <div className="grow">
                    <strong>{h.subject}{h.test && <span className="status">Éval</span>}</strong>
                    <small className="clamp">{h.title}</small>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  )
}
