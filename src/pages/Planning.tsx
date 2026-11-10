import { useEffect, useRef, useState, type TouchEvent } from 'react'
import { useSession } from '../state/session'
import { useWeek } from '../hooks/useWeek'
import { hasEdits } from '../planning/edits'
import { DAYS, todayIndex } from '../lib'
import { Empty, PageHeader, Segmented } from '../components/ui'
import { Icon } from '../components/Icon'

const nowHHMM = () => new Date().toTimeString().slice(0, 5)

/** « 9 – 13 nov. » à partir du lundi de la semaine. */
function weekLabel(mondayIso: string) {
  const mon = new Date(mondayIso + 'T12:00:00')
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  const m = (d: Date) => d.toLocaleDateString('fr-FR', { month: 'short' })
  return mon.getMonth() === fri.getMonth()
    ? `${mon.getDate()} – ${fri.getDate()} ${m(fri)}`
    : `${mon.getDate()} ${m(mon)} – ${fri.getDate()} ${m(fri)}`
}

export function Planning() {
  const [offset, setOffset] = useState(0)
  const [day, setDay] = useState(todayIndex())
  const [now, setNow] = useState(nowHHMM)
  const touch = useRef<{ x: number; y: number } | null>(null)
  const { lessons, monday, loading, failed } = useWeek(offset)
  const { planEdits } = useSession()

  useEffect(() => {
    const t = setInterval(() => setNow(nowHHMM()), 30_000)
    return () => clearInterval(t)
  }, [])

  const week = monday ? { monday } : undefined
  const isToday = offset === 0 && day === (new Date().getDay() + 6) % 7
  const list = lessons.filter((l) => l.day === day).sort((a, b) => a.start.localeCompare(b.start))

  const onStart = (e: TouchEvent) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY } }
  const onEnd = (e: TouchEvent) => {
    const t = touch.current
    touch.current = null
    if (!t) return
    const dx = e.changedTouches[0].clientX - t.x
    const dy = e.changedTouches[0].clientY - t.y
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return
    setDay((d) => Math.min(4, Math.max(0, d + (dx < 0 ? 1 : -1))))
  }

  return (
    <>
      <PageHeader title="Emploi du temps" />
      <div className="week-nav">
        <button className="icon-btn flip" onClick={() => setOffset((o) => o - 1)} aria-label="Semaine précédente"><Icon name="chevron" size={18} /></button>
        <button className="week-label" onClick={() => { setOffset(0); setDay(todayIndex()) }} disabled={offset === 0}
          aria-label={offset === 0 ? 'Semaine affichée' : 'Revenir à cette semaine'}>
          <strong>{week ? weekLabel(week.monday) : '…'}</strong>
          <small>{offset === 0 ? 'Cette semaine' : offset === 1 ? 'Semaine prochaine' : offset === -1 ? 'Semaine dernière' : 'Revenir à aujourd’hui'}</small>
        </button>
        <button className="icon-btn" onClick={() => setOffset((o) => o + 1)} aria-label="Semaine suivante"><Icon name="chevron" size={18} /></button>
      </div>
      <Segmented label="Jour" value={String(day)} onChange={(v) => setDay(Number(v))}
        options={DAYS.map((d, i) => [String(i), d.slice(0, 3)] as const)} />
      <div className="swipe-area" onTouchStart={onStart} onTouchEnd={onEnd}>
        {failed ? <Empty>Impossible de charger cette semaine.</Empty>
          : loading ? <div className="spinner" style={{ margin: '40px auto' }} />
          : list.length === 0 ? <Empty>Aucun cours</Empty> : (
          <ul className="list schedule" key={`${offset}-${day}`}>
            {list.map((l) => {
              const live = isToday && !l.cancelled && l.start <= now && now < l.end
              return (
                <li key={l.id} className={`${l.cancelled ? 'cancelled' : ''} ${live ? 'current' : ''}`}>
                  <span className="time">{l.start}<small>{l.end}</small></span>
                  <div className="grow">
                    <strong>{l.subject}</strong>
                    <small>{[l.room, l.teacher].filter(Boolean).join(' · ')}</small>
                  </div>
                  {l.cancelled && <span className="status bad">{l.byYou ? 'Annulé par toi' : 'Annulé'}</span>}
                  {l.custom && !l.cancelled && <span className="status">Ajouté</span>}
                  {live && <span className="status accent">En cours</span>}
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <section className="plan-tools">
        <a href="#/planning/edit" className="btn primary">Vue semaine et modifications</a>
        <p className="muted small">
          Vois ta semaine en grille, annule ou masque un cours, change une salle ou un horaire, ajoute un cours.
          {hasEdits(planEdits) ? ' Tu as des modifications en cours.' : ''} Elles restent dans cette app : l’école ne les voit pas.
        </p>
        <a href="https://www.ecoledirecte.com" target="_blank" rel="noopener noreferrer" className="text-btn">Ouvrir le site École Directe ↗</a>
      </section>
    </>
  )
}
