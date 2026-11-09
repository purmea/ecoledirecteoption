import { useState } from 'react'
import { useData, useSession } from '../state/session'
import { formatDate } from '../lib'
import { Card, Empty, PageHeader, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'

type Filter = 'todo' | 'done' | 'all'

export function Devoirs() {
  const { homework } = useData()
  const { toggleHomework } = useSession()
  const [filter, setFilter] = useState<Filter>('todo')
  const list = homework
    .filter((h) => (filter === 'all' ? true : filter === 'done' ? h.done : !h.done))
    .sort((a, b) => a.due.localeCompare(b.due))
  const doneCount = homework.filter((h) => h.done).length

  // Regroupement par date de rendu
  const groups = new Map<string, typeof list>()
  for (const h of list) groups.set(h.due, [...(groups.get(h.due) ?? []), h])

  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount} sur ${homework.length} terminés`} />
      <div className="progress-line" aria-hidden="true">
        <span style={{ width: `${homework.length ? (doneCount / homework.length) * 100 : 0}%` }} />
      </div>
      <Segmented label="Filtre" value={filter} onChange={setFilter}
        options={[['todo', 'À faire'], ['done', 'Faits'], ['all', 'Tous']] as const} />
      {list.length === 0 ? <Card><Empty>Rien ici</Empty></Card> : (
        [...groups].map(([due, items]) => (
          <div key={due} className="hw-group">
            <h3 className="group-title">Pour {formatDate(due, { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
            <Card>
              <ul className="list">
                {items.map((h) => (
                  <li key={h.id} className={h.done ? 'done' : ''}>
                    <button className={`check ${h.done ? 'on' : ''}`} onClick={() => toggleHomework(h.id)}
                      aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                      {h.done && <Icon name="check" size={14} />}
                    </button>
                    <div className="grow">
                      <strong>{h.subject}{h.test && <span className="pill inline">Éval</span>}</strong>
                      <small className="clamp">{h.title}</small>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        ))
      )}
    </>
  )
}
