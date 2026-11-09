import { useState } from 'react'
import type { Homework } from '../data/demo'
import { formatDate } from '../lib'
import { Card, Empty, PageHeader, SubjectDot } from '../components/ui'
import { Icon } from '../components/Icon'

type Filter = 'todo' | 'done' | 'all'

export function Devoirs({ homework, onToggle }: { homework: Homework[]; onToggle: (id: string) => void }) {
  const [filter, setFilter] = useState<Filter>('todo')
  const list = homework
    .filter((h) => (filter === 'all' ? true : filter === 'done' ? h.done : !h.done))
    .sort((a, b) => a.due.localeCompare(b.due))
  const doneCount = homework.filter((h) => h.done).length

  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount}/${homework.length} terminés`} />
      <div className="tabs" role="tablist">
        {([['todo', 'À faire'], ['done', 'Faits'], ['all', 'Tous']] as const).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} onClick={() => setFilter(k)}>{label}</button>
        ))}
      </div>
      <Card>
        {list.length === 0 ? <Empty>Rien ici 👌</Empty> : (
          <ul className="list">
            {list.map((h) => (
              <li key={h.id} className={h.done ? 'done' : ''}>
                <button className={`check ${h.done ? 'on' : ''}`} onClick={() => onToggle(h.id)}
                  aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                  {h.done && <Icon name="check" size={14} />}
                </button>
                <div className="grow">
                  <strong>{h.title}</strong>
                  <small><SubjectDot subject={h.subject} /> {h.subject}</small>
                </div>
                <span className="muted">{formatDate(h.due, { weekday: 'short', day: 'numeric' })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  )
}
