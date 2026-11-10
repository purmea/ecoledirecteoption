import type { Grade } from './types'

/** Note ramenée sur 20. */
export const on20 = (g: Grade) => (g.value / g.outOf) * 20

export function weightedAverage(list: Grade[]): number | null {
  const totalCoef = list.reduce((s, g) => s + g.coef, 0)
  if (!totalCoef) return null
  return list.reduce((s, g) => s + on20(g) * g.coef, 0) / totalCoef
}

/** Moyenne générale = moyenne des moyennes par matière (comme sur École Directe, coef matière = 1). */
export function generalAverage(list: Grade[]): number | null {
  const subjects = groupBySubject(list)
  if (!subjects.length) return null
  return subjects.reduce((s, x) => s + x.average, 0) / subjects.length
}

export function groupBySubject(list: Grade[]) {
  const map = new Map<string, Grade[]>()
  for (const g of list) map.set(g.subject, [...(map.get(g.subject) ?? []), g])
  return [...map.entries()].map(([subject, items]) => {
    const withClass = items.filter((g) => g.classAvg !== null)
    const classTotal = withClass.reduce((s, g) => s + g.coef, 0)
    return {
      subject,
      items: [...items].sort((a, b) => b.date.localeCompare(a.date)),
      average: weightedAverage(items)!,
      classAverage: classTotal
        ? withClass.reduce((s, g) => s + ((g.classAvg! / g.outOf) * 20) * g.coef, 0) / classTotal
        : null,
    }
  })
}

/** Évolution de la moyenne générale : un point par date de note. */
export function averageTimeline(list: Grade[]) {
  const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date))
  const dates = [...new Set(sorted.map((g) => g.date))]
  return dates.map((date) => ({ date, value: generalAverage(sorted.filter((g) => g.date <= date))! }))
}

export const fmt = (n: number) => n.toLocaleString('fr-FR', { maximumFractionDigits: 2 })

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', opts)

export const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi']

/** Index du jour scolaire courant (0 = lundi), week-end → lundi. */
export function todayIndex(d = new Date()) {
  const i = (d.getDay() + 6) % 7
  return i > 4 ? 0 : i
}

export function greeting(d = new Date()) {
  const h = d.getHours()
  return h < 5 || h >= 18 ? 'Bonsoir' : 'Bonjour'
}

/** « à l'instant », « il y a 5 min », « il y a 2 h », « hier »… */
export function timeAgo(at: number, now = Date.now()) {
  const min = Math.floor((now - at) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `il y a ${h} h`
  const d = Math.floor(h / 24)
  return d === 1 ? 'hier' : `il y a ${d} jours`
}

/** « 1er Trimestre » → « T1 », « 2ème Semestre » → « S2 » ; autre libellé : inchangé (écoles à périodes différentes). */
export function periodShort(label: string) {
  const a = /(\d+)\s*(?:er|re|e|ème|eme|ère)?\s*(trimestre|semestre)/i.exec(label)
  if (a) return `${a[2][0].toUpperCase()}${a[1]}`
  const b = /(trimestre|semestre)\s*(\d+)/i.exec(label)
  if (b) return `${b[1][0].toUpperCase()}${b[2]}`
  return label
}
