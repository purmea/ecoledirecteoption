import { useEffect, useMemo, useRef, useState } from 'react'
import { useData, useSession } from '../state/session'
import { Sheet } from '../components/Sheet'
import { toast } from '../fx'
import { Icon } from '../components/Icon'
import type { HomeworkFile } from '../types'
import { useHomeworkCheck } from '../hooks/useHomeworkCheck'
import { formatDate } from '../lib'
import { Empty, PageHeader } from '../components/ui'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mondayOf = (isoDate: string) => {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

export function Devoirs() {
  const { homework } = useData()
  const onCheck = useHomeworkCheck()
  const { fetchHomeworkFile } = useSession()
  const [openId, setOpenId] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)

  // Jours qui ont des devoirs (triés), avec le nombre restant à faire pour chacun.
  const days = useMemo(() => {
    const map = new Map<string, { total: number; left: number }>()
    for (const h of homework) {
      const d = map.get(h.due) ?? { total: 0, left: 0 }
      d.total++
      if (!h.done) d.left++
      map.set(h.due, d)
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([due, v]) => ({ due, ...v }))
  }, [homework])

  // Jour choisi par défaut : le premier jour (à partir d'aujourd'hui) qui a encore des devoirs.
  const [day, setDay] = useState<string>(() => {
    const today = iso(new Date())
    return (days.find((d) => d.due >= today && d.left > 0) ?? days.find((d) => d.due >= today) ?? days.at(-1) ?? { due: today }).due
  })

  // Garde le jour choisi visible dans la barre
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [day])

  const list = homework.filter((h) => h.due === day)
  const total = homework.length
  const doneCount = homework.filter((h) => h.done).length
  const current = days.find((d) => d.due === day)

  const opened = homework.find((h) => h.id === openId) ?? null

  /** Récupère la pièce jointe puis la télécharge / l'ouvre. */
  const openFile = async (f: HomeworkFile) => {
    setBusy(f.id)
    try {
      const url = URL.createObjectURL(await fetchHomeworkFile(f))
      const a = document.createElement('a')
      a.href = url
      a.download = f.name
      a.rel = 'noopener'
      document.body.appendChild(a)
      a.click()
      a.remove()
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Fichier indisponible.', 'check')
    } finally {
      setBusy(null)
    }
  }

  let lastWeek = ''
  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount} sur ${total} terminés`} />

      {days.length === 0 ? <Empty>Aucun devoir</Empty> : (
        <>
          <div className="day-strip" ref={stripRef} role="tablist" aria-label="Jour">
            {days.map((d) => {
              const week = mondayOf(d.due)
              const newWeek = lastWeek && week !== lastWeek
              lastWeek = week
              const date = new Date(d.due + 'T12:00:00')
              return (
                <button key={d.due} role="tab" aria-selected={d.due === day} className={`day-chip ${newWeek ? 'new-week' : ''} ${d.left === 0 ? 'clear' : ''}`}
                  onClick={() => setDay(d.due)} aria-label={`${formatDate(d.due, { weekday: 'long', day: 'numeric', month: 'long' })} : ${d.left} à faire`}>
                  <span className="dc-name">{date.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}</span>
                  <span className="dc-num">{date.getDate()}</span>
                  <span className="dc-count">{d.left === 0 ? '✓' : d.left}</span>
                </button>
              )
            })}
          </div>

          <header className="day-head">
            <h2>{formatDate(day, { weekday: 'long', day: 'numeric', month: 'long' })}</h2>
            <span>{current ? (current.left === 0 ? 'Tout est fait' : `${current.left} à faire sur ${current.total}`) : ''}</span>
          </header>

          {list.length === 0 ? <Empty>Aucun devoir ce jour-là</Empty> : (
            <ul className="list" key={day}>
              {list.map((h) => (
                <li key={h.id} className={h.done ? 'done' : ''}>
                  <button className={`check ${h.done ? 'on' : ''}`} onClick={() => onCheck(h.id, h.due, h.done)}
                    aria-label={h.done ? 'Marquer comme à faire' : 'Marquer comme fait'} aria-pressed={h.done}>
                    <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} /></svg>
                  </button>
                  <button className="grow hw-open" onClick={() => setOpenId(h.id)} aria-label={`Voir le détail : ${h.subject}`}>
                    <strong>{h.subject}{h.test && <span className="status">Éval</span>}{h.files?.length ? <Icon name="clip" size={14} /> : null}</strong>
                    <small className="clamp">{h.title}</small>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    
      <Sheet open={!!opened} title="Détail du devoir" onClose={() => setOpenId(null)}>
        {opened && (
          <>
            <h2 className="sheet-title">{opened.subject}</h2>
            <p className="sheet-sub">Pour {formatDate(opened.due, { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <p className="sheet-flags">
              {opened.test && <span className="status accent">Évaluation</span>}
              {opened.done && <span className="status">Fait</span>}
            </p>
            <div className="hw-body">{opened.title}</div>
            {opened.files && opened.files.length > 0 && (
              <>
                <h3 className="sub-title">Pièces jointes</h3>
                <div className="sheet-list">
                  {opened.files.map((f) => (
                    <button key={f.id} onClick={() => void openFile(f)} disabled={busy === f.id}>
                      {busy === f.id ? <span className="spinner" /> : <Icon name="clip" size={20} />}
                      <span>{f.name}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="btn primary hw-done" onClick={() => onCheck(opened.id, opened.due, opened.done)}>
              {opened.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
            </button>
          </>
        )}
      </Sheet>
    </>
  )
}
