// Connexion et récupération des données École Directe, converties au format de l'app.
// Référence (non officielle) : https://github.com/EduWireApps/ecoledirecte-api-docs
import type { Grade, Homework, Incident, Lesson, Message, MessageDetail, Period, SchoolData, Student } from '../types'
import { b64decode, edRequest } from './client'

export interface Account {
  id: number
  typeCompte: string
  prenom: string
  nom: string
  nomEtablissement?: string
  anneeScolaireCourante?: string
  profile?: { classe?: { libelle?: string }; photo?: string; nomEtablissement?: string }
}

export interface Session {
  token: string
  /** Dernier en-tête 2FA-Token reçu ; le vrai site le renvoie aussi une fois connecté. */
  twoFa?: string
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
  | { kind: 'qcm'; token: string; twoFa?: string; qcm: Qcm }

/**
 * Login. Avec `trust` (cn/cv obtenus après le QCM), on reproduit la forme exacte du vrai
 * site : cn/cv à la racine ET dans fa[] avec uniq: false (doc, PR #55).
 */
export async function login(identifiant: string, motdepasse: string, trust?: DeviceTrust, twoFa?: string): Promise<LoginResult> {
  const body: Record<string, unknown> = { identifiant, motdepasse, isReLogin: false, uuid: '' }
  if (trust) {
    body.cn = trust.cn
    body.cv = trust.cv
    body.fa = [{ cn: trust.cn, cv: trust.cv, uniq: false }]
  }
  const r = await edRequest<{ accounts?: Account[] }>('/v3/login.awp', body, { verbe: '', twoFa, allowCodes: [250] })
  if (!r.token) throw new Error('École Directe n’a pas renvoyé de jeton de connexion.')

  if (r.code === 250) {
    // QCM : c'est l'en-tête 2FA-Token (pas X-Token) qui chaîne les appels doubleauth.
    const q = await getQcm(r.token, r.twoFa)
    return { kind: 'qcm', token: r.token, twoFa: q.twoFa ?? r.twoFa, qcm: q.qcm }
  }

  const accounts = r.data.accounts ?? []
  const account = accounts.find((a) => a.typeCompte === 'E')
  if (!account) {
    throw new Error(accounts.length
      ? 'Seuls les comptes élèves sont pris en charge pour le moment.'
      : 'Aucun compte trouvé.')
  }
  return { kind: 'ok', session: { token: r.token, twoFa: r.twoFa ?? twoFa, account } }
}

async function getQcm(token: string, twoFa?: string): Promise<{ qcm: Qcm; twoFa?: string }> {
  const r = await edRequest<{ question: string; propositions: string[] }>('/v3/connexion/doubleauth.awp', {},
    twoFa ? { verbe: 'get', twoFa } : { verbe: 'get', token })
  return {
    twoFa: r.twoFa ?? twoFa,
    qcm: {
      question: b64decode(r.data.question),
      options: r.data.propositions.map((raw) => ({ raw, label: b64decode(raw) })),
    },
  }
}

/** Répond au QCM ; renvoie les jetons cn/cv à rejouer dans le login, et le 2FA-Token suivant. */
export async function answerQcm(token: string, twoFa: string | undefined, choice: string): Promise<{ trust: DeviceTrust; twoFa?: string }> {
  const r = await edRequest<DeviceTrust>('/v3/connexion/doubleauth.awp', { choix: choice },
    twoFa ? { verbe: 'post', twoFa } : { verbe: 'post', token })
  return { trust: { cn: r.data.cn, cv: r.data.cv }, twoFa: r.twoFa ?? twoFa }
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
  const r = await edRequest<RawGrades>(`/v3/eleves/${s.account.id}/notes.awp`, { anneeScolaire: '' }, { token: s.token, twoFa: s.twoFa })
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

export async function fetchLessonsFor(s: Session, monday: Date) {
  const friday = new Date(monday)
  friday.setDate(monday.getDate() + 4)
  const r = await edRequest<RawLesson[]>(`/v3/E/${s.account.id}/emploidutemps.awp`,
    { dateDebut: isoDate(monday), dateFin: isoDate(friday), avecTrous: false }, { token: s.token, twoFa: s.twoFa })
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

async function fetchHomework(s: Session) {
  const r = await edRequest<RawHomeworkList>(`/v3/Eleves/${s.account.id}/cahierdetexte.awp`, {}, { token: s.token, twoFa: s.twoFa })
  const list = r.data && typeof r.data === 'object' ? r.data : {}
  const dates = Object.keys(list).sort().slice(0, 14)

  // Le détail (consigne) est dans une route par jour ; on la récupère pour les 14 prochains jours de devoirs.
  const details = new Map<number, string>()
  await Promise.all(dates.map(async (date) => {
    try {
      const d = await edRequest<RawHomeworkDay>(`/v3/Eleves/${s.account.id}/cahierdetexte/${date}.awp`, {}, { token: r.token ?? s.token, twoFa: s.twoFa })
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

interface RawLife {
  absencesRetards?: Record<string, unknown>[]
  sanctionsEncouragements?: Record<string, unknown>[]
}
const text = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Absences, retards, punitions, sanctions et exclusions (les encouragements sont ignorés). Jamais bloquant. */
export async function fetchLife(s: Session): Promise<{ incidents: Incident[] } | null> {
  try {
    const r = await edRequest<RawLife>(`/v3/eleves/${s.account.id}/viescolaire.awp`, {}, { token: s.token, twoFa: s.twoFa })
    const incidents: Incident[] = []
    for (const a of r.data.absencesRetards ?? []) {
      const type = text(a.typeElement).toLowerCase()
      const date = text(a.date).slice(0, 10)
      if (!date) continue
      incidents.push({
        id: `a${text(a.id) || date + incidents.length}`, kind: type.startsWith('retard') ? 'retard' : 'absence', date,
        label: text(a.motif) || text(a.libelle), justified: a.justifie === true,
        detail: text(a.motif) && text(a.libelle) && text(a.libelle) !== text(a.motif) ? text(a.libelle) : undefined,
      })
    }
    for (const a of r.data.sanctionsEncouragements ?? []) {
      const type = text(a.typeElement).toLowerCase()
      if (type.startsWith('encouragement')) continue
      const date = text(a.date).slice(0, 10)
      if (!date) continue
      const label = text(a.motif) || text(a.libelle)
      incidents.push({
        id: `s${text(a.id) || date + incidents.length}`, date, label,
        kind: /exclu/i.test(`${a.libelle} ${a.motif}`) ? 'exclusion' : type.startsWith('punition') ? 'punition' : 'sanction',
        detail: text(a.motif) && text(a.libelle) && text(a.libelle) !== label ? text(a.libelle) : undefined,
      })
    }
    return { incidents: incidents.sort((x, y) => y.date.localeCompare(x.date)) }
  } catch {
    return null // droit manquant ou route indisponible : la section est simplement masquée
  }
}

/** Charge toutes les données. Renvoie aussi le dernier jeton reçu (École Directe le renouvelle). */
export async function fetchAll(s: Session): Promise<{ data: SchoolData; token: string }> {
  const [g, l, h, m, life] = await Promise.all([fetchGrades(s), fetchLessonsFor(s, displayedMonday()), fetchHomework(s), fetchMessages(s), fetchLife(s)])
  return {
    data: {
      student: toStudent(s.account),
      periods: g.periods,
      currentPeriod: g.currentPeriod,
      grades: g.grades,
      lessons: l.lessons,
      homework: h.homework,
      ...(life ? { incidents: life.incidents } : {}),
      ...('messages' in m ? { messages: m.messages } : { messagesError: m.error }),
    },
    token: h.token ?? l.token ?? g.token ?? s.token,
  }
}

export async function setHomeworkDone(s: Session, id: string, done: boolean) {
  const body = done
    ? { idDevoirsEffectues: [Number(id)], idDevoirsNonEffectues: [] }
    : { idDevoirsEffectues: [], idDevoirsNonEffectues: [Number(id)] }
  return edRequest(`/v3/Eleves/${s.account.id}/cahierdetexte.awp`, body, { verbe: 'put', token: s.token, twoFa: s.twoFa })
}

// --- Messagerie ------------------------------------------------------------------------------
// La liste des messages n'est pas décrite dans la documentation communautaire du dépôt ; la forme lue ici
// (messages.received[…]) est celle utilisée par d'autres bibliothèques. La lecture est volontairement
// tolérante : une réponse inattendue donne un message d'erreur clair, jamais un plantage.

/** « 2025-2026 » : année scolaire du compte, sinon calculée (rentrée en septembre). */
function schoolYear(s: Session, now = new Date()) {
  if (s.account.anneeScolaireCourante) return s.account.anneeScolaireCourante
  const start = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${start}-${start + 1}`
}

type Person = string | { name?: string; nom?: string; prenom?: string; civilite?: string } | null | undefined
function personName(p: Person): string {
  if (!p) return ''
  if (typeof p === 'string') return p.trim()
  return (p.name || [p.civilite, p.prenom, p.nom].filter(Boolean).join(' ')).trim()
}

/** Transforme le HTML d'un message en texte : jamais de HTML injecté dans la page. */
export function htmlToText(html: string): string {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  doc.querySelectorAll('script, style, head').forEach((n) => n.remove())
  doc.querySelectorAll('br').forEach((n) => n.replaceWith('\n'))
  doc.querySelectorAll('p, h1, h2, h3, h4, blockquote, ul, ol').forEach((n) => n.append('\n\n'))
  doc.querySelectorAll('div, li, tr').forEach((n) => n.append('\n'))
  doc.querySelectorAll('li').forEach((n) => n.prepend('• '))
  doc.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href') ?? ''
    if (/^https?:\/\//i.test(href) && a.textContent?.trim() !== href) a.append(` (${href})`)
  })
  return (doc.body.textContent ?? '').replace(/\u00a0/g, ' ').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

/** Corps de message : base64 (cas général) ou HTML brut. */
function messageBody(content: unknown): string {
  if (typeof content !== 'string' || !content) return ''
  return htmlToText(content.includes('<') ? content : b64decode(content))
}

export function parseMessages(data: unknown): Message[] | null {
  const d = data as { messages?: { received?: unknown[] } | unknown[] } | null
  const list = Array.isArray(d?.messages) ? d.messages
    : Array.isArray((d?.messages as { received?: unknown[] } | undefined)?.received) ? (d!.messages as { received: unknown[] }).received
    : null
  if (!list) return null
  return list.flatMap((raw) => {
    const m = raw as { id?: number | string; subject?: string; from?: Person; date?: string; read?: boolean; files?: unknown[] }
    if (m?.id === undefined || m.id === null) return []
    return [{
      id: String(m.id),
      subject: (typeof m.subject === 'string' && m.subject.trim()) || '(sans objet)',
      from: personName(m.from) || 'Expéditeur inconnu',
      date: typeof m.date === 'string' ? m.date : '',
      read: m.read !== false,
      hasFiles: Array.isArray(m.files) && m.files.length > 0,
    }]
  })
}

/** Liste des messages reçus, ou { error } si la messagerie n'a pas pu être lue. */
export async function fetchMessages(s: Session): Promise<{ messages: Message[] } | { error: string }> {
  try {
    const q = new URLSearchParams({
      force: 'false', typeRecuperation: 'received', idClasseur: '0', orderBy: 'date', order: 'DESC',
      query: '', onlyRead: '', page: '0', itemsPerPage: '100', getAll: '0',
    })
    const r = await edRequest<unknown>(`/v3/eleves/${s.account.id}/messages.awp?${q}`,
      { anneeMessages: schoolYear(s) }, { token: s.token, twoFa: s.twoFa })
    const messages = parseMessages(r.data)
    return messages ? { messages } : { error: 'réponse inattendue d’École Directe.' }
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Messagerie indisponible.' }
  }
}

/** Ouvre un message (École Directe le marque comme lu). */
export async function fetchMessageDetail(s: Session, id: string): Promise<MessageDetail> {
  const r = await edRequest<Record<string, unknown>>(`/v3/eleves/${s.account.id}/messages/${encodeURIComponent(id)}.awp?mode=destinataire`,
    { anneeMessages: schoolYear(s) }, { token: s.token, twoFa: s.twoFa })
  const d = r.data ?? {}
  const to = Array.isArray(d.to) ? (d.to as Person[]).map(personName).filter(Boolean) : []
  const files = Array.isArray(d.files)
    ? (d.files as { libelle?: string; name?: string }[]).map((f) => f.libelle || f.name || 'Pièce jointe')
    : []
  return {
    id,
    subject: (typeof d.subject === 'string' && d.subject.trim()) || '(sans objet)',
    from: personName(d.from as Person) || 'Expéditeur inconnu',
    to,
    date: typeof d.date === 'string' ? d.date : '',
    body: messageBody(d.content),
    files,
  }
}
