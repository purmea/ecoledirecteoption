// Données de démonstration — aucune connexion à l'API École Directe pour l'instant.

export interface Grade {
  id: string
  subject: string
  label: string
  value: number
  outOf: number
  coef: number
  classAvg: number
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
}

export const student = {
  firstName: 'Camille',
  lastName: 'Martin',
  className: '3ème B',
  school: 'Collège Jean Moulin',
}

export const subjectColors: Record<string, string> = {
  Mathématiques: '#6366f1',
  Français: '#ec4899',
  'Histoire-Géo': '#f59e0b',
  Anglais: '#10b981',
  SVT: '#22c55e',
  'Physique-Chimie': '#06b6d4',
  EPS: '#f97316',
  Espagnol: '#ef4444',
}

export const grades: Grade[] = [
  { id: 'g1', subject: 'Mathématiques', label: 'Contrôle — Fonctions', value: 16, outOf: 20, coef: 2, classAvg: 12.4, date: '2026-11-04' },
  { id: 'g2', subject: 'Mathématiques', label: 'DM — Géométrie', value: 18.5, outOf: 20, coef: 1, classAvg: 14.1, date: '2026-10-15' },
  { id: 'g3', subject: 'Français', label: 'Rédaction', value: 13, outOf: 20, coef: 2, classAvg: 11.8, date: '2026-11-02' },
  { id: 'g4', subject: 'Français', label: 'Dictée', value: 7, outOf: 10, coef: 1, classAvg: 6.2, date: '2026-10-20' },
  { id: 'g5', subject: 'Histoire-Géo', label: 'Évaluation — 1ère GM', value: 15, outOf: 20, coef: 1, classAvg: 13, date: '2026-10-28' },
  { id: 'g6', subject: 'Anglais', label: 'Oral', value: 17, outOf: 20, coef: 1, classAvg: 13.5, date: '2026-11-06' },
  { id: 'g7', subject: 'SVT', label: 'TP — Génétique', value: 14, outOf: 20, coef: 1, classAvg: 12.9, date: '2026-10-22' },
  { id: 'g8', subject: 'Physique-Chimie', label: 'Contrôle — Atomes', value: 11, outOf: 20, coef: 2, classAvg: 10.7, date: '2026-11-05' },
  { id: 'g9', subject: 'Espagnol', label: 'Vocabulaire', value: 19, outOf: 20, coef: 1, classAvg: 15, date: '2026-10-30' },
  { id: 'g10', subject: 'EPS', label: 'Course de demi-fond', value: 16, outOf: 20, coef: 1, classAvg: 14, date: '2026-10-18' },
]

export const lessons: Lesson[] = [
  { id: 'l1', day: 0, start: '08:00', end: '09:00', subject: 'Mathématiques', room: 'B12', teacher: 'M. Bernard' },
  { id: 'l2', day: 0, start: '09:00', end: '10:00', subject: 'Français', room: 'A04', teacher: 'Mme Petit' },
  { id: 'l3', day: 0, start: '10:15', end: '11:15', subject: 'Anglais', room: 'C21', teacher: 'Mrs Smith' },
  { id: 'l4', day: 0, start: '13:30', end: '15:30', subject: 'EPS', room: 'Gymnase', teacher: 'M. Robert' },
  { id: 'l5', day: 1, start: '08:00', end: '10:00', subject: 'SVT', room: 'Labo 2', teacher: 'Mme Durand' },
  { id: 'l6', day: 1, start: '10:15', end: '11:15', subject: 'Histoire-Géo', room: 'A11', teacher: 'M. Leroy', cancelled: true },
  { id: 'l7', day: 1, start: '14:00', end: '15:00', subject: 'Espagnol', room: 'C08', teacher: 'Sra García' },
  { id: 'l8', day: 2, start: '08:00', end: '09:00', subject: 'Physique-Chimie', room: 'Labo 1', teacher: 'M. Moreau' },
  { id: 'l9', day: 2, start: '09:00', end: '11:00', subject: 'Mathématiques', room: 'B12', teacher: 'M. Bernard' },
  { id: 'l10', day: 3, start: '08:00', end: '10:00', subject: 'Français', room: 'A04', teacher: 'Mme Petit' },
  { id: 'l11', day: 3, start: '10:15', end: '11:15', subject: 'Histoire-Géo', room: 'A11', teacher: 'M. Leroy' },
  { id: 'l12', day: 3, start: '13:30', end: '14:30', subject: 'Anglais', room: 'C21', teacher: 'Mrs Smith' },
  { id: 'l13', day: 4, start: '08:00', end: '09:00', subject: 'Espagnol', room: 'C08', teacher: 'Sra García' },
  { id: 'l14', day: 4, start: '09:00', end: '10:00', subject: 'Mathématiques', room: 'B12', teacher: 'M. Bernard' },
  { id: 'l15', day: 4, start: '10:15', end: '12:15', subject: 'Physique-Chimie', room: 'Labo 1', teacher: 'M. Moreau' },
]

export const homework: Homework[] = [
  { id: 'h1', subject: 'Mathématiques', title: 'Exercices 12 à 15 p. 84', due: '2026-11-10', done: false },
  { id: 'h2', subject: 'Français', title: 'Lire le chapitre 3 du Horla', due: '2026-11-11', done: false },
  { id: 'h3', subject: 'Anglais', title: 'Apprendre le vocabulaire unit 4', due: '2026-11-12', done: true },
  { id: 'h4', subject: 'SVT', title: 'Compte rendu du TP', due: '2026-11-13', done: false },
  { id: 'h5', subject: 'Histoire-Géo', title: 'Fiche de révision — 1ère GM', due: '2026-11-17', done: false },
]
