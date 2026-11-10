export interface Student {
  firstName: string
  lastName: string
  className: string
  school: string
  photo?: string
}

export interface Period {
  code: string
  label: string
  start: string // ISO
  end: string
}

export interface Grade {
  id: string
  period: string // Period.code
  subject: string
  label: string
  value: number
  outOf: number
  coef: number
  classAvg: number | null // sur outOf
  date: string // ISO
}

export interface Lesson {
  id: string
  day: number // 0 = lundi
  start: string // HH:mm
  end: string
  subject: string
  room: string
  teacher: string
  cancelled?: boolean
  /** Annulé par toi dans l'app (pas par l'école). */
  byYou?: boolean
  /** Annulé par l'école (information d'origine). */
  official?: boolean
  /** Ajouté à la main. */
  custom?: boolean
  /** Modifié, annulé ou ajouté dans l'app. */
  modified?: boolean
}

export interface Homework {
  id: string
  subject: string
  title: string
  due: string // ISO
  done: boolean
  test?: boolean
}

export interface Message {
  id: string
  subject: string
  from: string
  date: string // « 2026-11-09 10:05:03 »
  read: boolean
  hasFiles: boolean
}

export interface MessageDetail {
  id: string
  subject: string
  from: string
  to: string[]
  date: string
  body: string // texte brut (le HTML des messages n'est jamais injecté dans la page)
  files: string[]
}

/** Vie scolaire : absences, retards, punitions, sanctions et exclusions. */
export interface Incident {
  id: string
  kind: 'absence' | 'retard' | 'punition' | 'sanction' | 'exclusion'
  date: string // ISO
  /** Motif ou intitulé tel que donné par l'école. */
  label: string
  /** Absence ou retard justifié(e). */
  justified?: boolean
  /** Durée ou précision (« 8 min », « 2 h »…). */
  detail?: string
}

export interface SchoolData {
  student: Student
  periods: Period[]
  currentPeriod: string
  grades: Grade[]
  lessons: Lesson[]
  homework: Homework[]
  /** Vie scolaire (absente des anciennes copies ou si l'école ne la partage pas). */
  incidents?: Incident[]
  /** Messagerie (absente des anciennes copies gardées sur l'appareil). */
  messages?: Message[]
  /** Renseigné si la messagerie n'a pas pu être lue (réponse inattendue, droit manquant…). */
  messagesError?: string
}
