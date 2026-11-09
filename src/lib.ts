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
