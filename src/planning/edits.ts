import type { Lesson } from '../types'

/** Cours ajouté à la main. `week` = lundi (ISO) de la semaine concernée ; absent = chaque semaine. */
export interface CustomLesson { id: string; day: number; start: string; end: string; subject: string; room: string; teacher: string; week?: string }

/**
 * Modifications de l'emploi du temps faites dans l'app. Elles restent sur l'appareil : elles ne changent
 * rien chez École Directe et l'école ne les voit pas.
 */
export interface PlanEdits {
  cancelled: string[] // cours annulés par toi
  restored: string[] // cours annulés par l'école que tu rétablis
  hidden: string[] // cours masqués
  edited: Record<string, { room?: string; teacher?: string; start?: string; end?: string }>
  added: CustomLesson[]
}

export const EMPTY_PLAN: PlanEdits = { cancelled: [], restored: [], hidden: [], edited: {}, added: [] }

export type PlanAction =
  | { type: 'cancel'; id: string }
  | { type: 'restore'; id: string; officialCancelled: boolean }
  | { type: 'hide'; id: string }
  | { type: 'unhide'; id: string }
  | { type: 'edit'; id: string; patch: { room?: string; teacher?: string; start?: string; end?: string } }
  | { type: 'add'; lesson: CustomLesson }
  | { type: 'remove'; id: string }
  | { type: 'reset' }
  | { type: 'set'; plan: PlanEdits }

/** Identifiant d'un cours ajouté, pour une semaine donnée (les cours hebdomadaires ont une occurrence par semaine). */
export const occurrenceId = (c: CustomLesson, monday: string) => (c.week ? c.id : `${c.id}@${monday}`)
export const baseId = (id: string) => id.split('@')[0]

const add = (a: string[], id: string) => (a.includes(id) ? a : [...a, id])
const drop = (a: string[], id: string) => a.filter((x) => x !== id)

export function reducePlan(e: PlanEdits, a: PlanAction): PlanEdits {
  switch (a.type) {
    case 'cancel': return { ...e, cancelled: add(e.cancelled, a.id), restored: drop(e.restored, a.id) }
    case 'restore': return a.officialCancelled
      ? { ...e, restored: add(e.restored, a.id), cancelled: drop(e.cancelled, a.id) }
      : { ...e, cancelled: drop(e.cancelled, a.id) }
    case 'hide': return { ...e, hidden: add(e.hidden, a.id) }
    case 'unhide': return { ...e, hidden: drop(e.hidden, a.id) }
    case 'edit': return { ...e, edited: { ...e.edited, [a.id]: { ...e.edited[a.id], ...a.patch } } }
    case 'add': return { ...e, added: [...e.added, a.lesson] }
    case 'remove': return { ...e, added: e.added.filter((c) => c.id !== baseId(a.id)) }
    case 'reset': return EMPTY_PLAN
    case 'set': return a.plan
  }
}

export const hasEdits = (e: PlanEdits) =>
  e.cancelled.length + e.restored.length + e.hidden.length + e.added.length + Object.keys(e.edited).length > 0

/** Cours de la semaine avec tes modifications appliquées. */
export function applyEdits(lessons: Lesson[], monday: string, e: PlanEdits): Lesson[] {
  const out: Lesson[] = lessons
    .filter((l) => !e.hidden.includes(l.id))
    .map((l) => {
      const patch = e.edited[l.id]
      const byYou = e.cancelled.includes(l.id)
      const restored = e.restored.includes(l.id)
      return { ...l, ...patch, cancelled: byYou || (!!l.cancelled && !restored), byYou, official: !!l.cancelled, modified: !!patch || byYou || restored }
    })
  for (const c of e.added) {
    if (c.week && c.week !== monday) continue
    const id = occurrenceId(c, monday)
    if (e.hidden.includes(id)) continue
    const patch = e.edited[id]
    out.push({
      id, day: c.day, start: c.start, end: c.end, subject: c.subject, room: c.room, teacher: c.teacher, ...patch,
      cancelled: e.cancelled.includes(id), byYou: e.cancelled.includes(id), custom: true, modified: true,
    })
  }
  return out
}

/** Teinte stable par matière (pour colorer les blocs de l'agenda). */
export function subjectHue(subject: string) {
  let h = 0
  for (const ch of subject) h = (h * 31 + ch.charCodeAt(0)) % 360
  return h
}
