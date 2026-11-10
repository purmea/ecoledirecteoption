import { useEffect, useMemo, useState } from 'react'
import { useData, useSession } from '../state/session'
import type { MessageDetail } from '../types'
import { Empty, PageHeader, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'

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

export function Messages() {
  const { messages = [], messagesError } = useData()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const unread = messages.filter((m) => !m.read).length
  const list = useMemo(() => messages.filter((m) => filter === 'all' || !m.read), [messages, filter])

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
          options={[['all', 'Tous'], ['unread', 'Non lus']] as const} />
      )}
      {list.length === 0 ? (
        !messagesError && <Empty>{filter === 'unread' ? 'Aucun message non lu' : 'Aucun message'}</Empty>
      ) : (
        <ul className="list msg-list">
          {list.map((m) => (
            <li key={m.id} className={m.read ? '' : 'unread'}>
              <a href={`#/messages/${encodeURIComponent(m.id)}`}>
                <i className="msg-dot" aria-label={m.read ? undefined : 'Non lu'} />
                <span className="grow">
                  <strong>{m.from}</strong>
                  <span className="msg-subject">{m.subject}</span>
                </span>
                <span className="msg-meta">
                  <small>{messageDate(m.date)}</small>
                  {m.hasFiles && <Icon name="clip" size={14} />}
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
  const { openMessage } = useSession()
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

  const to = msg ? (msg.to.length > 3 ? `${msg.to.slice(0, 3).join(', ')} +${msg.to.length - 3}` : msg.to.join(', ')) : ''

  return (
    <>
      <a href="#/messages" className="back"><Icon name="chevron" size={16} />Messages</a>
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
