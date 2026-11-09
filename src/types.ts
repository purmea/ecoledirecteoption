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

export interface SchoolData {
  student: Student
  periods: Period[]
  currentPeriod: string
  grades: Grade[]
  lessons: Lesson[]
  homework: Homework[]
}
