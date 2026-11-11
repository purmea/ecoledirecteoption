import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { useSession } from '../state/session'
import { useWeek } from '../hooks/useWeek'
import { displayedMonday, isoDate } from '../api/ecoledirecte'
import { DAYS } from '../lib'
import type { Lesson } from '../types'
import { hasEdits, type CustomLesson } from '../planning/edits'
import { Icon } from '../components/Icon'
import { Sheet } from '../components/Sheet'
import { Drawer } from '../components/Drawer'
import { toast } from '../fx'

type View = 'day' | 'week' | 'month'
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }
const parse = (iso: string) => new Date(iso + 'T12:00:00')
const mondayOf = (d: Date) => { const m = new Date(d); m.setDate(m.getDate() - ((m.getDay() + 6) % 7)); return m }
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x }
const dayIdx = (d: Date) => (d.getDay() + 6) % 7
const weekOffset = (d: Date) => Math.round((mondayOf(d).getTime() - mondayOf(displayedMonday()).getTime()) / (7 * 864e5))
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Nom de matière façon École Directe : majuscules, sans accents. */
const upper = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toUpperCase()
const PALETTE = ['#f7c6a0', '#d9b8f2', '#9fe3e0', '#f5a9b8', '#cde7a0', '#ffd08a', '#b7c4ff', '#e9c9a6']
function colorOf(subject: string) {
  const s = upper(subject)
  if (s.startsWith('FRANC')) return '#bdd1f7'
  if (s.startsWith('ANGLAIS')) return '#f9f28a'
  if (s.startsWith('MATH')) return '#66cc55'
  if (s.startsWith('HISTOIRE') || s.startsWith('ENS. MORAL') || s.startsWith('ENSEIGN')) return '#8fb3c0'
  if (s.startsWith('SC. ECONO') || s.startsWith('SES')) return '#e9b27a'
  let h = 0
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) % 997
  return PALETTE[h % PALETTE.length]
}

/** Répartit en colonnes les cours qui se chevauchent dans une même journée. */
function layout(items: Lesson[]) {
  const sorted = [...items].sort((a, b) => toMin(a.start) - toMin(b.start) || toMin(b.end) - toMin(a.end))
  const out: { l: Lesson; col: number; cols: number }[] = []
  let cluster: { l: Lesson; col: number }[] = []
  let clusterEnd = -1
  const flush = () => { const cols = Math.max(1, ...cluster.map((c) => c.col + 1)); cluster.forEach((c) => out.push({ ...c, cols })); cluster = [] }
  for (const l of sorted) {
    if (cluster.length && toMin(l.start) >= clusterEnd) { flush(); clusterEnd = -1 }
    const taken = new Set(cluster.filter((c) => toMin(c.l.end) > toMin(l.start)).map((c) => c.col))
    let col = 0
    while (taken.has(col)) col++
    cluster.push({ l, col })
    clusterEnd = Math.max(clusterEnd, toMin(l.end))
  }
  if (cluster.length) flush()
  return out
}

const Svg = ({ children, size = 26 }: { children: React.ReactNode; size?: number }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
)

export function Planning() {
  const { editPlan, planEdits, refresh, refreshing, applyPlan, loadWeek } = useSession()
  const [view, setView] = useState<View>('day')
  const [date, setDate] = useState(() => new Date())
  const [menu, setMenu] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [actions, setActions] = useState(false)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const { lessons, monday, loading, failed } = useWeek(weekOffset(date))

  const selected = lessons.find((l) => l.id === openId) ?? null
  const today = new Date()
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString()

  const label = view === 'day' ? date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : view === 'week' ? (() => { const m = mondayOf(date); const f = addDays(m, 4); return `Du ${m.getDate()} ${m.getMonth() === f.getMonth() ? '' : m.toLocaleDateString('fr-FR', { month: 'long' }) + ' '}au ${f.getDate()} ${f.toLocaleDateString('fr-FR', { month: 'long' })}` })()
    : cap(date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }))
  const step = (n: number) => setDate((d) => {
    if (view === 'day') return addDays(d, n)
    if (view === 'week') return addDays(d, 7 * n)
    const x = new Date(d); x.setDate(1); x.setMonth(x.getMonth() + n); return x
  })

  // Mois : on charge les semaines du mois pour montrer les jours qui ont des cours.
  const [weeks, setWeeks] = useState<Record<number, { lessons: Lesson[]; monday: string }>>({})
  const first = useMemo(() => { const x = new Date(date); x.setDate(1); return x }, [date])
  const cells = useMemo(() => { const s = mondayOf(first); return Array.from({ length: 42 }, (_, i) => addDays(s, i)) }, [first])
  useEffect(() => {
    if (view !== 'month') return
    let alive = true
    const offs = [...new Set(cells.filter((c) => dayIdx(c) === 0).map(weekOffset))].filter((o) => !weeks[o])
    offs.forEach((o) => loadWeek(o).then((w) => alive && setWeeks((x) => ({ ...x, [o]: w }))).catch(() => {}))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, first])
  const countOn = (c: Date) => {
    const w = weeks[weekOffset(c)]
    if (!w || dayIdx(c) > 4) return 0
    return applyPlan(w.lessons, w.monday).filter((l) => l.day === dayIdx(c) && !l.cancelled).length
  }

  const act = (_label: string, run: () => void) => { run(); setOpenId(null) }
  const day0 = Math.min(4, dayIdx(date))

  return (
    <div className="ed"
      onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }}
      onTouchEnd={(e) => {
        const t = touch.current
        touch.current = null
        if (!t) return
        const dx = e.changedTouches[0].clientX - t.x, dy = e.changedTouches[0].clientY - t.y
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6) step(dx < 0 ? 1 : -1)
      }}>
      <div className="ed-top">
      <header className="ed-bar">
        <button className="ed-icon" onClick={() => setMenu(true)} aria-label="Menu"><Svg size={30}><path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" /></Svg></button>
        <h1>Emploi du temps</h1>
        <div className="ed-actions">
          <button className="ed-icon small" onClick={() => setAdding(true)} aria-label="Créer un cours">
            <svg viewBox="0 0 32 32" width="24" height="24" fill="currentColor" aria-hidden="true"><circle cx="13" cy="7" r="3.4" /><path d="M6.8 17.5c0-3.2 2.7-5 6.2-5s6.2 1.8 6.2 5z" /><circle cx="5" cy="22.5" r="2.8" /><path d="M0.5 29c0-2.4 2-3.9 4.5-3.9s4.5 1.5 4.5 3.9z" /><circle cx="19" cy="22.5" r="2.8" /><path d="M14.5 29c0-2.4 2-3.9 4.5-3.9s4.5 1.5 4.5 3.9z" /><path d="M26.5 5v10M21.5 10h10" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
          <button className="ed-icon" onClick={() => setActions(true)} aria-label="Modifier l’emploi du temps">
            <svg viewBox="0 0 32 32" width="30" height="30" fill="currentColor" aria-hidden="true"><circle cx="16" cy="7" r="3.6" /><path d="M9.5 17.5c0-3.3 2.9-5.2 6.5-5.2s6.5 1.9 6.5 5.2z" /><circle cx="6.5" cy="22" r="3" /><path d="M1.5 29c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2z" /><circle cx="25.5" cy="22" r="3" /><path d="M20.5 29c0-2.6 2.2-4.2 5-4.2s5 1.6 5 4.2z" /><path d="M13.5 22.5l2.5 2.5 2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
          </button>
          <button className={`ed-icon ${refreshing ? 'spin' : ''}`} onClick={() => { void refresh(); setWeeks({}) }} aria-label="Actualiser"><Svg size={26}><path d="M20 12a8 8 0 1 1-2.6-5.9" strokeWidth="1.9" /><path d="M20 4v5h-5" strokeWidth="1.9" /></Svg></button>
        </div>
      </header>

      <div className="ed-seg" role="tablist" aria-label="Affichage" style={{ '--i': ['day', 'week', 'month'].indexOf(view) } as CSSProperties}>
        {([['day', 'Jour'], ['week', 'Semaine'], ['month', 'Mois']] as const).map(([k, t]) => (
          <button key={k} role="tab" aria-selected={view === k} onClick={() => setView(k)}>{t}</button>
        ))}
      </div>

      <div className="ed-date">
        <label className="ed-date-label">
          <span className="ed-cal" aria-hidden="true">31</span>{label}
          <input type="date" value={isoDate(date)} aria-label="Choisir une date" onChange={(e) => e.target.value && setDate(parse(e.target.value))} />
        </label>
      </div>
      </div>

      {view === 'month' ? (
        <div className="ed-month">
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i} className="ed-mh">{d}</span>)}
          {cells.map((c) => {
            const n = countOn(c)
            return (
              <button key={c.toISOString()} className={`ed-mc ${c.getMonth() !== first.getMonth() ? 'out' : ''} ${sameDay(c, today) ? 'today' : ''} ${sameDay(c, date) ? 'sel' : ''}`}
                onClick={() => { setDate(c); setView('day') }} aria-label={c.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }) + (n ? `, ${n} cours` : '')}>
                <b>{c.getDate()}</b>
                <i>{Array.from({ length: Math.min(3, n) }, (_, k) => <u key={k} />)}</i>
              </button>
            )
          })}
        </div>
      ) : failed ? <p className="ed-empty">Impossible de charger cette semaine.</p> : loading ? <div className="spinner" style={{ margin: '40px auto' }} /> : (
        <Grid view={view} date={date} lessons={lessons} monday={monday} today={today} onOpen={setOpenId} />
      )}


      <button className="ed-reset" onClick={() => editPlan({ type: 'reset' })} disabled={!hasEdits(planEdits)}>Original</button>

      <Sheet open={actions} title="Emploi du temps" light onClose={() => setActions(false)}>
        <h2 className="sheet-title">Emploi du temps</h2>
        <p className="sheet-sub">Tes modifications restent dans l’app : l’école ne les voit pas.</p>
        <div className="sheet-list">
          <button onClick={() => { setActions(false); setAdding(true) }}><Icon name="plus" size={20} /><span>Ajouter un cours</span></button>
          {hasEdits(planEdits) && <button className="danger" onClick={() => { editPlan({ type: 'reset' }); setActions(false) }}><Icon name="undo" size={20} /><span>Effacer toutes mes modifications</span></button>}
        </div>
      </Sheet>

      <Drawer open={menu} onClose={() => setMenu(false)} />

      <Sheet open={!!selected} title="Cours" light onClose={() => setOpenId(null)}>
        {selected && <LessonPanel key={selected.id} l={selected} close={() => setOpenId(null)} act={act} />}
      </Sheet>
      <Sheet open={adding} title="Ajouter un cours" light onClose={() => setAdding(false)}>
        {monday && <AddPanel monday={monday} day0={day0} close={() => setAdding(false)} />}
      </Sheet>
    </div>
  )
}

/** Grille horaire : un jour (comme l'app École Directe) ou toute la semaine. */
function Grid({ view, date, lessons, monday, today, onOpen }: { view: View; date: Date; lessons: Lesson[]; monday?: string; today: Date; onOpen: (id: string) => void }) {
  const H = view === 'day' ? 38 : 46
  const dayList = view === 'day' ? [dayIdx(date)] : [0, 1, 2, 3, 4]
  const shown = lessons.filter((l) => dayList.includes(l.day))
  const from = 7
  const to = view === 'day' ? 23 : Math.max(18, Math.ceil(Math.max(0, ...shown.map((l) => toMin(l.end))) / 60))
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i)
  const dates = monday ? dayList.map((i) => addDays(parse(monday), i)) : []

  return (
    <div className={`ed-grid ${view}`} style={{ '--H': `${H}px`, '--cols': dayList.length } as CSSProperties}>
      {view === 'week' && (
        <div className="ed-wk-head">
          <span />
          {dates.map((d) => <span key={d.toISOString()} className={d.toDateString() === today.toDateString() ? 'today' : ''}>{DAYS[dayIdx(d)].slice(0, 3)}<b>{d.getDate()}</b></span>)}
        </div>
      )}
      {view === 'day' && <div className="ed-allday"><span>Journée</span><i /></div>}
      <div className="ed-body" style={{ height: hours.length * H }}>
        <div className="ed-hours">{hours.map((h) => <span key={h} style={{ height: H }}>{String(h).padStart(2, '0')}</span>)}</div>
        <div className="ed-cols">
          {dayList.map((d) => (
            <div key={d} className="ed-col">
              {layout(shown.filter((l) => l.day === d)).map(({ l, col, cols }) => (
                <button key={l.id} className={`ed-block ${l.cancelled ? 'cancelled' : ''}`}
                  style={{
                    top: ((toMin(l.start) - from * 60) / 60) * H + 1, height: Math.max(20, ((toMin(l.end) - toMin(l.start)) / 60) * H - 3),
                    left: `calc(${(col / cols) * 100}% + 3px)`, width: `calc(${100 / cols}% - 6px)`, background: l.cancelled ? undefined : colorOf(l.subject),
                  } as CSSProperties}
                  onClick={() => onOpen(l.id)} aria-label={`${l.subject}, ${DAYS[l.day]} ${l.start} à ${l.end}${l.cancelled ? ', annulé' : ''}`}>
                  {l.cancelled ? (
                    <>
                      <span className="ed-l1">
                        <span className="ed-time">{view === 'day' ? `${l.start} - ${l.end}` : ''}</span>
                        <b className="ed-annule"><svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><path d="M12 2.5 1.5 21h21z" fill="currentColor" /><path d="M12 9v5.5M12 17.2v.6" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" /></svg>ANNULE</b>
                      </span>
                      <span className="ed-l2"><i aria-hidden="true">i</i>{upper(l.subject)}{l.room && ` - ${l.room}`}</span>
                    </>
                  ) : (
                    <>
                      <span className="ed-l1">
                        {view === 'day' && <span className="ed-time">{l.start} - {l.end}</span>}
                        <strong>{l.modified && view === 'day' && <i className="ed-i" aria-hidden="true">i</i>}{upper(l.subject)}</strong>
                      </span>
                      {l.room && <span className="ed-room">{l.modified && view === 'day' && <i className="ed-i" aria-hidden="true">i</i>}{l.room}</span>}
                      {l.teacher && <span className="ed-prof">{l.teacher}</span>}
                    </>
                  )}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LessonPanel({ l, close, act }: { l: Lesson; close: () => void; act: (label: string, run: () => void, undo?: () => void) => void }) {
  const { editPlan } = useSession()
  const [editing, setEditing] = useState(false)
  const [room, setRoom] = useState(l.room)
  const [teacher, setTeacher] = useState(l.teacher)
  const [start, setStart] = useState(l.start)
  const [end, setEnd] = useState(l.end)
  const timeOk = toMin(end) > toMin(start)

  const save = (e: FormEvent) => {
    e.preventDefault()
    if (!timeOk) return
    editPlan({ type: 'edit', id: l.id, patch: { room: room.trim(), teacher: teacher.trim(), start, end } })
    toast('Cours modifié')
    close()
  }

  return (
    <>
      <h2 className="sheet-title">{l.subject}</h2>
      <p className="sheet-sub">{DAYS[l.day]} · {l.start} – {l.end}{l.room && ` · ${l.room}`}{l.teacher && ` · ${l.teacher}`}</p>
      <p className="sheet-flags">
        {l.custom && <span className="status">Ajouté par toi</span>}
        {l.modified && !l.cancelled && !l.custom && <span className="status accent">Modifié</span>}
      </p>

      {editing ? (
        <form className="sheet-form" onSubmit={save}>
          <label className="field"><span>Salle</span><input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={30} /></label>
          <label className="field"><span>Professeur</span><input value={teacher} onChange={(e) => setTeacher(e.target.value)} maxLength={40} /></label>
          <div className="sheet-times">
            <label className="field"><span>Début</span><input type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
            <label className="field"><span>Fin</span><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
          </div>
          {!timeOk && <p className="error">L’heure de fin doit être après le début.</p>}
          <button className="btn primary" disabled={!timeOk}>Enregistrer</button>
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Retour</button>
        </form>
      ) : (
        <div className="sheet-list">
          {l.cancelled ? (
            <button onClick={() => act('Cours rétabli', () => editPlan({ type: 'restore', id: l.id, officialCancelled: !!l.official }), () => editPlan({ type: 'cancel', id: l.id }))}>
              <Icon name="undo" size={20} /><span>Rétablir le cours</span>
            </button>
          ) : (
            <button onClick={() => act('Cours annulé', () => editPlan({ type: 'cancel', id: l.id }), () => editPlan({ type: 'restore', id: l.id, officialCancelled: !!l.official }))}>
              <Icon name="x" size={20} /><span>Annuler le cours</span>
            </button>
          )}
          <button onClick={() => setEditing(true)}><Icon name="clock" size={20} /><span>Modifier la salle, le prof ou l’horaire</span></button>
          {l.custom ? (
            <button className="danger" onClick={() => act('Cours supprimé', () => editPlan({ type: 'remove', id: l.id }))}>
              <Icon name="trash" size={20} /><span>Supprimer ce cours</span>
            </button>
          ) : (
            <button className="danger" onClick={() => act('Cours masqué', () => editPlan({ type: 'hide', id: l.id }), () => editPlan({ type: 'unhide', id: l.id }))}>
              <Icon name="trash" size={20} /><span>Masquer ce cours</span>
            </button>
          )}
        </div>
      )}
    </>
  )
}

function AddPanel({ monday, day0, close }: { monday: string; day0: number; close: () => void }) {
  const { editPlan } = useSession()
  const [subject, setSubject] = useState('')
  const [day, setDay] = useState(day0)
  const [start, setStart] = useState('14:00')
  const [end, setEnd] = useState('15:00')
  const [room, setRoom] = useState('')
  const [teacher, setTeacher] = useState('')
  const [weekly, setWeekly] = useState(false)
  const ok = subject.trim().length > 0 && toMin(end) > toMin(start)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!ok) return
    const lesson: CustomLesson = {
      id: `c${Date.now().toString(36)}`, day, start, end, subject: subject.trim(), room: room.trim(), teacher: teacher.trim(),
      ...(weekly ? {} : { week: monday }),
    }
    editPlan({ type: 'add', lesson })
    toast(weekly ? 'Cours ajouté chaque semaine' : 'Cours ajouté')
    close()
  }

  return (
    <form className="sheet-form" onSubmit={submit}>
      <h2 className="sheet-title">Ajouter un cours</h2>
      <label className="field"><span>Matière</span><input value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={40} placeholder="ex. Soutien maths" autoFocus /></label>
      <label className="field"><span>Jour</span>
        <select className="select" value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
        </select>
      </label>
      <div className="sheet-times">
        <label className="field"><span>Début</span><input type="time" value={start} onChange={(e) => setStart(e.target.value)} required /></label>
        <label className="field"><span>Fin</span><input type="time" value={end} onChange={(e) => setEnd(e.target.value)} required /></label>
      </div>
      <label className="field"><span>Salle</span><input value={room} onChange={(e) => setRoom(e.target.value)} maxLength={30} /></label>
      <label className="field"><span>Professeur</span><input value={teacher} onChange={(e) => setTeacher(e.target.value)} maxLength={40} /></label>
      <label className="toggle-row">
        <span className="grow"><span>Chaque semaine</span><small>Sinon, seulement cette semaine</small></span>
        <input type="checkbox" role="switch" className="switch" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} />
      </label>
      {toMin(end) <= toMin(start) && <p className="error">L’heure de fin doit être après le début.</p>}
      <button className="btn primary" disabled={!ok}>Ajouter</button>
      <button type="button" className="btn ghost" onClick={close}>Annuler</button>
    </form>
  )
}

