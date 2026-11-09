import { useState } from 'react'
import { useData, useSession } from '../state/session'
import { formatDate } from '../lib'
import { Empty, PageHeader, Segmented } from '../components/ui'
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
                <li key={h.id} className={h.done ? 'done' : ''}>
                  <button className={`check ${h.done ? 'on' : ''}`} onClick={() => toggleHomework(h.id)}
                    aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                    {h.done && <Icon name="check" size={13} />}
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
