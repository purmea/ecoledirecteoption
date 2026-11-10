import { useData, useSession } from '../state/session'
import { formatDate } from '../lib'
import { celebrate, haptic, toast } from '../fx'

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

/** « aujourd'hui », « demain », « mardi », ou « mardi 17 » au-delà de la semaine. */
export function dayLabel(due: string, now = new Date()) {
  const days = Math.round((new Date(due + 'T12:00:00').getTime() - new Date(iso(now) + 'T12:00:00').getTime()) / 864e5)
  if (days === 0) return 'aujourd’hui'
  if (days === 1) return 'demain'
  if (days > 1 && days < 7) return formatDate(due, { weekday: 'long' })
  return formatDate(due, { weekday: 'long', day: 'numeric' })
}

/** Coche / décoche un devoir et annonce combien il en reste pour CE jour. */
export function useHomeworkCheck() {
  const { homework } = useData()
  const { toggleHomework } = useSession()
  return (id: string, due: string, wasDone: boolean) => {
    haptic()
    toggleHomework(id)
    const left = homework.filter((h) => h.due === due).filter((h) => (h.id === id ? wasDone : !h.done)).length
    const when = dayLabel(due)
    if (wasDone) return toast(`${left} à faire pour ${when}`)
    if (homework.filter((h) => (h.id === id ? false : !h.done)).length === 0) {
      celebrate()
      return toast('Tout est fait, bravo !', 'party')
    }
    if (left === 0) return toast(`Tout est fait pour ${when}`, 'party')
    toast(`Plus que ${left} devoir${left > 1 ? 's' : ''} pour ${when}`)
  }
}
