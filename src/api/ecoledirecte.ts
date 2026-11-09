// Connexion et récupération des données École Directe, converties au format de l'app.
// Référence (non officielle) : https://github.com/EduWireApps/ecoledirecte-api-docs
import type { Grade, Homework, Lesson, Period, SchoolData, Student } from '../types'
import { b64decode, edRequest } from './client'

export interface Account {
  id: number
  typeCompte: string
  prenom: string
  nom: string
  nomEtablissement?: string
  profile?: { classe?: { libelle?: string }; photo?: string; nomEtablissement?: string }
}

export interface Session {
  token: string
  account: Account
}

export interface Qcm {
  question: string
  options: { label: string; raw: string }[]
}

export interface DeviceTrust {
  cn: string
  cv: string
}

export type LoginResult =
  | { kind: 'ok'; session: Session }
  | { kind: 'qcm'; token: string; qcm: Qcm }

export async function login(identifiant: string, motdepasse: string, trust?: DeviceTrust): Promise<LoginResult> {
  const body: Record<string, unknown> = { identifiant, motdepasse, isRelogin: false, uuid: '' }
  if (trust) body.fa = [trust]
  const r = await edRequest<{ accounts?: Account[] }>('/v3/login.awp', body, { verbe: '', allowCodes: [250] })
  if (!r.token) throw new Error('École Directe n’a pas renvoyé de jeton de connexion.')

  if (r.code === 250) return { kind: 'qcm', token: r.token, qcm: await getQcm(r.token) }

  const accounts = r.data.accounts ?? []
  const account = accounts.find((a) => a.typeCompte === 'E')
  if (!account) {
    throw new Error(accounts.length
      ? 'Seuls les comptes élèves sont pris en charge pour le moment.'
      : 'Aucun compte trouvé.')
  }
  return { kind: 'ok', session: { token: r.token, account } }
}

async function getQcm(token: string): Promise<Qcm> {
  const r = await edRequest<{ question: string; propositions: string[] }>('/v3/connexion/doubleauth.awp', {}, { verbe: 'get', token })
  return {
    question: b64decode(r.data.question),
    options: r.data.propositions.map((raw) => ({ raw, label: b64decode(raw) })),
  }
}

/** Répond au QCM de vérification ; renvoie les jetons à rejouer dans le login. */
export async function answerQcm(token: string, choice: string): Promise<DeviceTrust> {
  const r = await edRequest<DeviceTrust>('/v3/connexion/doubleauth.awp', { choix: choice }, { verbe: 'post', token })
  return { cn: r.data.cn, cv: r.data.cv }
}

// ---------------------------------------------------------------------------

/** "14,5" / "14.5" → 14.5 ; renvoie null pour "Abs", "Disp", "" … */
export function num(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const n = parseFloat(v.replace(',', '.').trim())
  return Number.isFinite(n) ? n : null
}

/** "MATHEMATIQUES" → "Mathématiques" (au mieux), "ANGLAIS LV1" → "Anglais LV1". */
export function prettySubject(s: string) {
  const known: Record<string, string> = {
    MATHEMATIQUES: 'Mathématiques', FRANCAIS: 'Français', 'HISTOIRE-GEOGRAPHIE': 'Histoire-Géo',
    'HISTOIRE & GEOGRAPHIE': 'Histoire-Géo', 'PHYSIQUE-CHIMIE': 'Physique-Chimie', 'SCIENCES VIE & TERRE': 'SVT',
    'ED.PHYSIQUE & SPORT.': 'EPS', 'EDUCATION PHYSIQUE ET SPORTIVE': 'EPS', 'EDUCATION MUSICALE': 'Éducation musicale',
    'ARTS PLASTIQUES': 'Arts plastiques', TECHNOLOGIE: 'Technologie',
  }
  const t = s.trim()
  if (known[t]) return known[t]
  return t.toLowerCase()
    .replace(/(^|[\s\-/(])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase())
    .replace(/\b(Lv\d|Lca|Emc|Svt|Eps|Nsi|Ses)\b/gi, (m) => m.toUpperCase())
}

const pad = (n: number) => String(n).padStart(2, '0')
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

function toStudent(a: Account): Student {
  return {
    firstName: a.prenom,
    lastName: a.nom,
    className: a.profile?.classe?.libelle ?? '',
    school: a.nomEtablissement ?? a.profile?.nomEtablissement ?? '',
    photo: a.profile?.photo ? `https:${a.profile.photo.replace(/^https?:/, '')}` : undefined,
  }
}

interface RawGrades {
  periodes?: { codePeriode: string; periode: string; annuel: boolean; dateDebut: string; dateFin: string }[]
  notes?: {
    id: number; devoir: string; codePeriode: string; libelleMatiere: string; coef: string; noteSur: string
    valeur: string; nonSignificatif: boolean; date: string; moyenneClasse: string
  }[]
}

async function fetchGrades(s: Session) {
  const r = await edRequest<RawGrades>(`/v3/eleves/${s.account.id}/notes.awp`, { anneeScolaire: '' }, { token: s.token })
  const periods: Period[] = (r.data.periodes ?? [])
    .filter((p) => !p.annuel)
    .map((p) => ({ code: p.codePeriode, label: p.periode, start: p.dateDebut, end: p.dateFin }))

  const grades: Grade[] = []
  for (const n of r.data.notes ?? []) {
    const value = num(n.valeur)
    const outOf = num(n.noteSur) ?? 20
    if (value === null || n.nonSignificatif || !outOf) continue
    grades.push({
      id: String(n.id),
      period: n.codePeriode.slice(0, 4),
      subject: prettySubject(n.libelleMatiere),
      label: n.devoir || 'Évaluation',
      value,
      outOf,
      coef: num(n.coef) ?? 1,
      classAvg: num(n.moyenneClasse),
      date: n.date,
    })
  }
  const today = isoDate(new Date())
  const current = periods.find((p) => p.start <= today && today <= p.end)
    ?? [...periods].reverse().find((p) => p.start <= today)
    ?? periods[0]
  return { periods, grades, token: r.token, currentPeriod: current?.code ?? '' }
}

/** Lundi de la semaine affichée (la suivante si on est le week-end). */
export function displayedMonday(now = new Date()) {
  const d = new Date(now)
  const day = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - day + (day > 4 ? 7 : 0))
  return d
}

interface RawLesson {
  id: number; matiere: string; text: string; start_date: string; end_date: string
  prof: string; salle: string; isAnnule: boolean; typeCours: string
}

async function fetchLessons(s: Session) {
  const monday = displayedMonday()
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const r = await edRequest<RawLesson[]>(`/v3/E/${s.account.id}/emploidutemps.awp`,
    { dateDebut: isoDate(monday), dateFin: isoDate(friday), avecTrous: false }, { token: s.token })
  const lessons: Lesson[] = (Array.isArray(r.data) ? r.data : [])
    .filter((l) => l.typeCours !== 'CONGE')
    .map((l) => {
      const [date, start] = l.start_date.split(' ')
      return {
        id: String(l.id),
        day: (new Date(date + 'T12:00:00').getDay() + 6) % 7,
        start,
        end: l.end_date.split(' ')[1],
        subject: prettySubject(l.matiere || l.text),
        room: l.salle,
        teacher: l.prof.trim(),
        cancelled: l.isAnnule,
      }
    })
    .filter((l) => l.day <= 4)
  return { lessons, token: r.token }
}

type RawHomeworkList = Record<string, { matiere: string; idDevoir: number; effectue: boolean; interrogation: boolean }[]>
interface RawHomeworkDay { matieres?: { id: number; aFaire?: { contenu?: string } }[] }

const htmlToText = (html: string) =>
  (new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '').replace(/\s+/g, ' ').trim()

async function fetchHomework(s: Session) {
  const r = await edRequest<RawHomeworkList>(`/v3/Eleves/${s.account.id}/cahierdetexte.awp`, {}, { token: s.token })
  const list = r.data && typeof r.data === 'object' ? r.data : {}
  const dates = Object.keys(list).sort().slice(0, 14)

  // Le détail (consigne) est dans une route par jour ; on la récupère pour les 14 prochains jours de devoirs.
  const details = new Map<number, string>()
  await Promise.all(dates.map(async (date) => {
    try {
      const d = await edRequest<RawHomeworkDay>(`/v3/Eleves/${s.account.id}/cahierdetexte/${date}.awp`, {}, { token: r.token ?? s.token })
      for (const m of d.data.matieres ?? []) {
        const txt = m.aFaire?.contenu ? htmlToText(b64decode(m.aFaire.contenu)) : ''
        if (txt) details.set(m.id, txt)
      }
    } catch { /* on garde le titre générique */ }
  }))

  const homework: Homework[] = Object.entries(list).flatMap(([due, items]) =>
    items.map((h) => ({
      id: String(h.idDevoir),
      subject: prettySubject(h.matiere),
      title: details.get(h.idDevoir) ?? (h.interrogation ? 'Évaluation' : 'Travail à faire'),
      due,
      done: h.effectue,
      test: h.interrogation,
    })))
  return { homework, token: r.token }
}

/** Charge toutes les données. Renvoie aussi le dernier jeton reçu (École Directe le renouvelle). */
export async function fetchAll(s: Session): Promise<{ data: SchoolData; token: string }> {
  const [g, l, h] = await Promise.all([fetchGrades(s), fetchLessons(s), fetchHomework(s)])
  return {
    data: {
      student: toStudent(s.account),
      periods: g.periods,
      currentPeriod: g.currentPeriod,
      grades: g.grades,
      lessons: l.lessons,
      homework: h.homework,
    },
    token: h.token ?? l.token ?? g.token ?? s.token,
  }
}

export async function setHomeworkDone(s: Session, id: string, done: boolean) {
  const body = done
    ? { idDevoirsEffectues: [Number(id)], idDevoirsNonEffectues: [] }
    : { idDevoirsEffectues: [], idDevoirsNonEffectues: [Number(id)] }
  return edRequest(`/v3/Eleves/${s.account.id}/cahierdetexte.awp`, body, { verbe: 'put', token: s.token })
}
