import { subjectColors, type Grade } from './data/demo'

export const colorOf = (subject: string) => subjectColors[subject] ?? '#64748b'

/** Note ramenée sur 20. */
export const on20 = (g: Grade) => (g.value / g.outOf) * 20

export function weightedAverage(list: Grade[]): number | null {
  const totalCoef = list.reduce((s, g) => s + g.coef, 0)
  if (!totalCoef) return null
  return list.reduce((s, g) => s + on20(g) * g.coef, 0) / totalCoef
}

export function groupBySubject(list: Grade[]) {
  const map = new Map<string, Grade[]>()
  for (const g of list) map.set(g.subject, [...(map.get(g.subject) ?? []), g])
  return [...map.entries()].map(([subject, items]) => ({
    subject,
    items: items.sort((a, b) => b.date.localeCompare(a.date)),
    average: weightedAverage(items)!,
    classAverage: items.reduce((s, g) => s + (g.classAvg / g.outOf) * 20, 0) / items.length,
  }))
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
  return h < 12 ? 'Bonjour' : h < 18 ? 'Bon après-midi' : 'Bonsoir'
}
