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

export interface SchoolData {
  student: Student
  periods: Period[]
  currentPeriod: string
  grades: Grade[]
  lessons: Lesson[]
  homework: Homework[]
  /** Messagerie (absente des anciennes copies gardées sur l'appareil). */
  messages?: Message[]
  /** Renseigné si la messagerie n'a pas pu être lue (réponse inattendue, droit manquant…). */
  messagesError?: string
}
