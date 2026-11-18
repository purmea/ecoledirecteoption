import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useData } from '../state/session'
import type { Homework } from '../types'
import { useHomeworkCheck } from '../hooks/useHomeworkCheck'
import { formatDate } from '../lib'
import { Empty, PageHeader } from '../components/ui'
import { Icon } from '../components/Icon'
import { useSession } from '../state/session'
import { haptic, toast } from '../fx'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const mondayOf = (isoDate: string) => {
  const d = new Date(isoDate + 'T12:00:00')
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return iso(d)
}

/** Gardés entre deux ouvertures de l'écran : retour depuis un devoir sans revenir au premier jour. */
let lastDay: string | null = null
let pastCache: Homework[] | null = null
let pastOpen = false

/** Les 7 derniers jours (hier compris), du plus ancien au plus récent. */
const pastDates = () => Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 7 + i); return iso(d) })

export function Devoirs() {
  const { loadPastHomework } = useSession()
  const [showPast, setShowPast] = useState(pastOpen)
  const [past, setPast] = useState<Homework[] | null>(pastCache)
  const [pastErr, setPastErr] = useState('')
  useEffect(() => {
    pastOpen = showPast
    if (!showPast || past) return
    loadPastHomework(pastDates()).then((l) => { pastCache = l; setPast(l) }).catch((e) => setPastErr(e instanceof Error ? e.message : String(e)))
  }, [showPast, past, loadPastHomework])

  const { homework: upcoming } = useData()
  const homework = useMemo(() => {
    if (!showPast || !past) return upcoming
    const ids = new Set(upcoming.map((h) => `${h.due}-${h.id}`))
    return [...past.filter((h) => !ids.has(`${h.due}-${h.id}`)), ...upcoming]
  }, [upcoming, past, showPast])
  const onCheck = useHomeworkCheck()
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
  const [day, setDayState] = useState<string>(() => {
    if (lastDay && days.some((d) => d.due === lastDay)) return lastDay
    const today = iso(new Date())
    return (days.find((d) => d.due >= today && d.left > 0) ?? days.find((d) => d.due >= today) ?? days.at(-1) ?? { due: today }).due
  })

  const setDay = (d: string) => { lastDay = d; setDayState(d) }

  // À l'ouverture de la semaine passée, on se place sur son premier jour ; à la fermeture, on revient sur un jour à venir.
  const wantPast = useRef(false)
  useEffect(() => {
    if (showPast && past && wantPast.current) {
      wantPast.current = false
      if (past.length) setDay(past[0].due)
    }
    if (!showPast && !days.some((d) => d.due === day)) {
      const today = iso(new Date())
      setDay((days.find((d) => d.due >= today) ?? days.at(-1) ?? { due: today }).due)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPast, past, days])
  const togglePast = () => { wantPast.current = !showPast; setShowPast(!showPast) }

  // Glisser à gauche / à droite sur la liste : jour suivant / précédent.
  const touch = useRef<{ x: number; y: number } | null>(null)
  const go = (step: number) => {
    const i = days.findIndex((d) => d.due === day)
    const next = days[i + step]
    if (next) { setDay(next.due); haptic(6) }
  }
  const swipe = {
    onTouchStart: (e: React.TouchEvent) => { const t = e.touches[0]; touch.current = { x: t.clientX, y: t.clientY } },
    onTouchEnd: (e: React.TouchEvent) => {
      const s = touch.current; touch.current = null
      if (!s) return
      const t = e.changedTouches[0], dx = t.clientX - s.x, dy = t.clientY - s.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1)
    },
  }

  // Garde le jour choisi visible dans la barre
  useEffect(() => {
    stripRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: lastDay === day ? 'instant' : 'smooth' })
  }, [day])

  const list = homework.filter((h) => h.due === day)
  const total = homework.length
  const doneCount = homework.filter((h) => h.done).length
  const current = days.find((d) => d.due === day)

  let lastWeek = ''
  return (
    <>
      <PageHeader title="Devoirs" subtitle={`${doneCount} sur ${total} terminés`} />

      {days.length === 0 ? <Empty>Aucun devoir</Empty> : (
        <>
          <div className="day-strip-row">
          <button className={`past-toggle ${showPast ? 'on' : ''}`} onClick={togglePast} aria-pressed={showPast}
            aria-label={showPast ? 'Masquer les jours précédents' : 'Voir les jours précédents (semaine dernière)'}>
            {showPast && !past && !pastErr ? <span className="spinner small" /> : <Icon name="chevron" size={18} />}
          </button>
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
          </div>
          {pastErr && showPast && <p className="muted small">{pastErr}</p>}

          <div className="swipe-area" {...swipe}>
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
                  <a href={`#/devoirs/${h.id}`} className="grow hw-open">
                    <strong>{h.subject}{h.test && <span className="status">Éval</span>}{h.files?.length ? <Icon name="clip" size={14} /> : null}</strong>
                    <small className="clamp">{h.title}</small>
                  </a>
                  <Icon name="chevron" size={16} />
                </li>
              ))}
            </ul>
          )}
          </div>
        </>
      )}
    </>
  )
}

/** Détail d'un devoir en plein écran : consigne complète et pièces jointes. */
export function DevoirView({ id }: { id: string }) {
  const { homework } = useData()
  const { download } = useSession()
  const onCheck = useHomeworkCheck()
  const [busy, setBusy] = useState<number | null>(null)
  const h = homework.find((x) => x.id === id) ?? pastCache?.find((x) => x.id === id)
  const [viewer, setViewer] = useState<{ url: string; name: string; type: string; blob: Blob } | null>(null)
  useEffect(() => () => { if (viewer) URL.revokeObjectURL(viewer.url) }, [viewer])
  if (!h) return (<><a href="#/devoirs" className="back"><Icon name="chevron" size={16} />Devoirs</a><Empty>Devoir introuvable</Empty></>)
  return (
    <article className="hw-view">
      <a href="#/devoirs" className="back"><Icon name="chevron" size={16} />Devoirs</a>
      <PageHeader title={h.subject} subtitle={`Pour ${formatDate(h.due, { weekday: 'long', day: 'numeric', month: 'long' })}`} />
      {h.test && <span className="status">Évaluation</span>}
      <div className="msg-body">{h.title}</div>
      {!!h.files?.length && (
        <div className="msg-files">
          <h2>Pièces jointes</h2>
          <ul>
            {h.files.map((f) => (
              <li key={f.id}>
                <button className="row-action" disabled={busy === f.id} onClick={async () => {
                  setBusy(f.id)
                  try {
                    const blob = await download(f.id)
                    setViewer({ url: URL.createObjectURL(blob), name: f.name, type: blob.type, blob })
                  } catch (e) { toast(e instanceof Error ? e.message : 'Téléchargement impossible') }
                  setBusy(null)
                }}>
                  <Icon name="clip" size={14} /> {busy === f.id ? 'Ouverture…' : f.name}
                  {f.size ? <small>{Math.max(1, Math.round(f.size / 1024))} Ko</small> : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {viewer && <FileViewer {...viewer} onClose={() => setViewer(null)} />}
      <button className={`btn ${h.done ? 'ghost' : 'primary'}`} onClick={() => onCheck(h.id, h.due, h.done)}>
        {h.done ? 'Marquer comme à faire' : 'Marquer comme fait'}
      </button>
    </article>
  )
}

/** Aperçu plein écran d'une pièce jointe (PDF, image), avec partage/enregistrement. */
function FileViewer({ url, name, type, blob, onClose }: { url: string; name: string; type: string; blob: Blob; onClose: () => void }) {
  const isImg = type.startsWith('image/') || /\.(png|jpe?g|gif|webp|heic)$/i.test(name)
  const isPdf = type.includes('pdf') || /\.pdf$/i.test(name)
  const share = async () => {
    const file = new File([blob], name, { type: type || 'application/octet-stream' })
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name }) } catch { /* annulé */ }
      return
    }
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }
  return createPortal(
    <div className="file-viewer" role="dialog" aria-modal="true" aria-label={name}>
      <header>
        <button className="text-btn" onClick={onClose}>Fermer</button>
        <strong className="clamp">{name}</strong>
        <button className="text-btn" onClick={share}>Enregistrer</button>
      </header>
      {isImg ? <img src={url} alt={name} />
        : isPdf ? <iframe src={url} title={name} />
        : <div className="fv-other"><p>Aperçu indisponible pour ce type de fichier.</p><button className="btn primary" onClick={share}>Ouvrir / enregistrer</button></div>}
    </div>,
    document.body,
  )
}
