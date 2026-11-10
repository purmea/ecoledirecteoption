import { useMemo, useState, type FormEvent } from 'react'
import { useSession } from '../state/session'
import { useWeek } from '../hooks/useWeek'
import { DAYS, todayIndex } from '../lib'
import type { Lesson } from '../types'
import { EMPTY_PLAN, hasEdits, subjectHue, type CustomLesson } from '../planning/edits'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/ui'
import { Sheet } from '../components/Sheet'
import { toast } from '../fx'

const HOUR = 62 // hauteur d'une heure dans la grille (px)
const toMin = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m }

function weekLabel(mondayIso: string) {
  const mon = new Date(mondayIso + 'T12:00:00')
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const m = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' })
  return mon.getMonth() === fri.getMonth() ? `${mon.getDate()} – ${fri.getDate()} ${m(fri)}` : `${mon.getDate()} ${m(mon)} – ${fri.getDate()} ${m(fri)}`
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

export function Planning() {
  const { editPlan, planEdits } = useSession()
  const [offset, setOffset] = useState(0)
  const { lessons, monday, loading, failed } = useWeek(offset)
  const [openId, setOpenId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  const selected = lessons.find((l) => l.id === openId) ?? null
  const { from, to } = useMemo(() => {
    const starts = lessons.map((l) => toMin(l.start)); const ends = lessons.map((l) => toMin(l.end))
    return { from: Math.min(8, Math.floor(Math.min(...starts, 480) / 60)), to: Math.max(17, Math.ceil(Math.max(...ends, 1020) / 60)) }
  }, [lessons])
  const todayCol = offset === 0 ? todayIndex() : -1
  const dates = useMemo(() => (monday ? DAYS.map((_, i) => { const d = new Date(monday + 'T12:00:00'); d.setDate(d.getDate() + i); return d.getDate() }) : []), [monday])

  const act = (label: string, run: () => void, undo?: () => void) => {
    run()
    setOpenId(null)
    toast(label, 'check', undo ? { label: 'Annuler', run: undo } : undefined)
  }

  return (
    <>
      <PageHeader title="Emploi du temps" />

      <div className="week-nav">
        <button className="icon-btn flip" onClick={() => setOffset((o) => o - 1)} aria-label="Semaine précédente"><Icon name="chevron" size={18} /></button>
        <button className="week-label" onClick={() => setOffset(0)} disabled={offset === 0}>
          <strong>{monday ? weekLabel(monday) : '…'}</strong>
          <small>{offset === 0 ? 'Cette semaine' : 'Revenir à cette semaine'}</small>
        </button>
        <button className="icon-btn" onClick={() => setOffset((o) => o + 1)} aria-label="Semaine suivante"><Icon name="chevron" size={18} /></button>
      </div>

      <p className="pe-note">Touche un cours pour l’annuler, le masquer ou le modifier. Ces changements restent dans l’app.</p>

      {failed ? <p className="error">Impossible de charger cette semaine.</p> : loading ? <div className="spinner" style={{ margin: '40px auto' }} /> : (
        <div className="wk-scroll">
          <div className="wk" style={{ '--hh': `${HOUR}px`, '--hours': to - from } as React.CSSProperties}>
            <div className="wk-head">
              <span />
              {DAYS.map((d, i) => (
                <span key={d} className={i === todayCol ? 'today' : ''}>{d.slice(0, 3)}<b>{dates[i]}</b></span>
              ))}
            </div>
            <div className="wk-body">
              <div className="wk-hours">
                {Array.from({ length: to - from }, (_, i) => <span key={i} style={{ top: i * HOUR }}>{from + i}h</span>)}
              </div>
              {DAYS.map((d, i) => (
                <div key={d} className={`wk-col ${i === todayCol ? 'today' : ''}`}>
                  {layout(lessons.filter((l) => l.day === i)).map(({ l, col, cols }) => {
                    const hue = subjectHue(l.subject)
                    return (
                      <button key={l.id} className={`wk-block ${l.cancelled ? 'cancelled' : ''} ${l.modified ? 'modified' : ''}`}
                        style={{
                          top: ((toMin(l.start) - from * 60) / 60) * HOUR, height: Math.max(22, ((toMin(l.end) - toMin(l.start)) / 60) * HOUR - 2),
                          left: `calc(${(col / cols) * 100}% + 2px)`, width: `calc(${100 / cols}% - 4px)`, '--hue': hue,
                        } as React.CSSProperties}
                        onClick={() => setOpenId(l.id)} aria-label={`${l.subject}, ${DAYS[l.day]} ${l.start} à ${l.end}${l.cancelled ? ', annulé' : ''}`}>
                        <strong>{l.subject}</strong>
                        <small>{l.room}</small>
                        <small>{l.start}–{l.end}</small>
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="pe-actions">
        <button className="btn primary" onClick={() => setAdding(true)}><Icon name="plus" size={16} /> Ajouter un cours</button>
        {hasEdits(planEdits) && (
          <button className="btn ghost danger" onClick={() => { const before = planEdits; editPlan({ type: 'set', plan: EMPTY_PLAN }); toast('Modifications effacées', 'check', { label: 'Annuler', run: () => editPlan({ type: 'set', plan: before }) }) }}>
            Effacer toutes mes modifications
          </button>
        )}
      </div>

      {/* Détail d'un cours */}
      <Sheet open={!!selected} title="Cours" onClose={() => setOpenId(null)}>
        {selected && <LessonPanel key={selected.id} l={selected} close={() => setOpenId(null)} act={act} />}
      </Sheet>

      {/* Ajout d'un cours */}
      <Sheet open={adding} title="Ajouter un cours" onClose={() => setAdding(false)}>
        {monday && <AddPanel monday={monday} close={() => setAdding(false)} />}
      </Sheet>
    </>
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
        {l.cancelled && <span className="status bad">{l.byYou ? 'Annulé par toi' : 'Annulé par l’école'}</span>}
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

function AddPanel({ monday, close }: { monday: string; close: () => void }) {
  const { editPlan } = useSession()
  const [subject, setSubject] = useState('')
  const [day, setDay] = useState(todayIndex())
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

