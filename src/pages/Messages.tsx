import { useEffect, useMemo, useState } from 'react'
import { useData, useMessages, useSession } from '../state/session'
import type { MessageDetail } from '../types'
import { Empty, PageHeader, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'
import { toast } from '../fx'

/** « 10:05 » aujourd'hui, « hier », « 9 nov. », « 9 nov. 2025 » si ce n'est pas l'année en cours. */
export function messageDate(raw: string, now = new Date()) {
  const d = new Date(raw.replace(' ', 'T'))
  if (Number.isNaN(d.getTime())) return ''
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const diff = Math.round((day(now) - day(d)) / 864e5)
  if (diff === 0) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  if (diff === 1) return 'hier'
  return d.toLocaleDateString('fr-FR', d.getFullYear() === now.getFullYear()
    ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
}

type Filter = 'all' | 'unread' | 'pinned' | 'archived'

export function Messages() {
  const { messagesError } = useData()
  const messages = useMessages()
  const [filter, setFilter] = useState<Filter>('all')
  const inbox = messages.filter((m) => !m.archived)
  const unread = inbox.filter((m) => !m.read).length
  const counts = { pinned: messages.filter((m) => m.pinned).length, archived: messages.filter((m) => m.archived).length }

  const list = useMemo(() => {
    const base = filter === 'archived' ? messages.filter((m) => m.archived)
      : filter === 'pinned' ? messages.filter((m) => m.pinned)
      : filter === 'unread' ? inbox.filter((m) => !m.read)
      : inbox
    // Les messages épinglés remontent en haut (le reste garde l'ordre de la boîte).
    return [...base].sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }, [messages, inbox, filter])

  return (
    <>
      <PageHeader title="Messages" subtitle={messagesError && !messages.length ? undefined : unread ? `${unread} non lu${unread > 1 ? 's' : ''}` : 'Tout est lu'} />
      {messagesError && (
        <p className="notice" role="status">
          {messages.length ? 'Actualisation impossible : ' : 'Impossible de lire la messagerie : '}{messagesError}
        </p>
      )}
      {(messages.length > 0 || !messagesError) && (
        <Segmented label="Filtre" value={filter} onChange={setFilter}
          options={[
            ['all', 'Tous'], ['unread', 'Non lus'],
            ['pinned', counts.pinned ? `Épinglés ${counts.pinned}` : 'Épinglés'],
            ['archived', counts.archived ? `Archivés ${counts.archived}` : 'Archivés'],
          ] as const} />
      )}
      {list.length === 0 ? (
        !messagesError && <Empty>{{ all: 'Aucun message', unread: 'Aucun message non lu', pinned: 'Aucun message épinglé', archived: 'Aucun message archivé' }[filter]}</Empty>
      ) : (
        <ul className="list msg-list">
          {list.map((m) => (
            <li key={m.id} className={`${m.read ? '' : 'unread'} ${m.pinned ? 'pinned' : ''}`}>
              <a href={`#/messages/${encodeURIComponent(m.id)}`}>
                <i className="msg-dot" aria-label={m.read ? undefined : 'Non lu'} />
                <span className="grow">
                  <strong>{m.from}</strong>
                  <span className="msg-subject">{m.subject}</span>
                </span>
                <span className="msg-meta">
                  <small>{messageDate(m.date)}</small>
                  <span className="msg-icons">
                    {m.pinned && <Icon name="pushpin" size={13} />}
                    {m.hasFiles && <Icon name="clip" size={14} />}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export function MessageView({ id }: { id: string }) {
  const { openMessage, messageAction } = useSession()
  const meta = useMessages().find((m) => m.id === id)
  const [msg, setMsg] = useState<MessageDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    setMsg(null)
    setError(null)
    openMessage(id)
      .then((m) => alive && setMsg(m))
      .catch((e) => alive && setError(e instanceof Error ? e.message : 'Message illisible.'))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const back = () => { location.hash = '#/messages' }
  const pinned = !!meta?.pinned
  const archived = !!meta?.archived

  const togglePin = () => {
    messageAction(id, pinned ? 'unpin' : 'pin')
    toast(pinned ? 'Message désépinglé' : 'Message épinglé', 'check')
  }
  const toggleArchive = () => {
    messageAction(id, archived ? 'unarchive' : 'archive')
    toast(archived ? 'Message remis dans la boîte' : 'Message archivé', 'check', { label: 'Annuler', run: () => messageAction(id, archived ? 'archive' : 'unarchive') })
    back()
  }
  const remove = () => {
    messageAction(id, 'delete')
    toast('Message supprimé', 'check', { label: 'Annuler', run: () => messageAction(id, 'restore') })
    back()
  }
  const markUnread = () => {
    messageAction(id, 'unread')
    toast('Marqué comme non lu', 'check')
    back()
  }

  const to = msg ? (msg.to.length > 3 ? `${msg.to.slice(0, 3).join(', ')} +${msg.to.length - 3}` : msg.to.join(', ')) : ''

  return (
    <>
      <div className="msg-top">
        <a href="#/messages" className="back"><Icon name="chevron" size={16} />Messages</a>
        {!error && (
          <div className="msg-actions" role="toolbar" aria-label="Actions sur le message">
            <button onClick={togglePin} aria-pressed={pinned} className={pinned ? 'on' : ''}><Icon name="pushpin" size={19} /><span>{pinned ? 'Épinglé' : 'Épingler'}</span></button>
            <button onClick={markUnread}><Icon name="mail" size={19} /><span>Non lu</span></button>
            <button onClick={toggleArchive}><Icon name="archive" size={19} /><span>{archived ? 'Désarchiver' : 'Archiver'}</span></button>
            <button onClick={remove} className="danger"><Icon name="trash" size={19} /><span>Supprimer</span></button>
          </div>
        )}
      </div>
      {error ? <p className="error">{error}</p> : !msg ? <div className="spinner" style={{ margin: '40px auto' }} /> : (
        <article className="msg">
          <h1>{msg.subject}</h1>
          <div className="msg-head">
            <strong>{msg.from}</strong>
            <small>{messageDate(msg.date)}{to && ` · à ${to}`}</small>
          </div>
          <div className="msg-body">{msg.body || 'Ce message est vide.'}</div>
          {msg.files.length > 0 && (
            <div className="msg-files">
              <h2>Pièces jointes</h2>
              <ul>{msg.files.map((f, i) => <li key={i}><Icon name="clip" size={14} />{f}</li>)}</ul>
              <small>Le téléchargement des pièces jointes n’est pas encore disponible.</small>
            </div>
          )}
        </article>
      )}
    </>
  )
}
