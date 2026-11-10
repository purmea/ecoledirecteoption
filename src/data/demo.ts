// Données de démonstration, utilisées par le mode « Essayer la démo ».
import type { Grade, Homework, Lesson, Message, MessageDetail, SchoolData } from '../types'

const student = {
  firstName: 'Camille',
  lastName: 'Martin',
  className: '3ème B',
  school: 'Collège Jean Moulin',
}

const grades: Grade[] = [
  { period: 'A001', id: 'g1', subject: 'Mathématiques', label: 'Contrôle — Équations', value: 9, outOf: 20, coef: 2, classAvg: 11.8, date: '2026-09-16' },
  { period: 'A001', id: 'g2', subject: 'Français', label: 'Rédaction — Portrait', value: 10, outOf: 20, coef: 2, classAvg: 11.2, date: '2026-09-18' },
  { period: 'A001', id: 'g3', subject: 'Anglais', label: 'Test de vocabulaire', value: 11, outOf: 20, coef: 1, classAvg: 12.5, date: '2026-09-22' },
  { period: 'A001', id: 'g4', subject: 'SVT', label: 'TP — Cellule', value: 11, outOf: 20, coef: 1, classAvg: 12.1, date: '2026-09-24' },
  { period: 'A001', id: 'g5', subject: 'Histoire-Géo', label: 'Évaluation — Chap. 1', value: 12, outOf: 20, coef: 1, classAvg: 12.4, date: '2026-09-26' },
  { period: 'A001', id: 'g6', subject: 'Physique-Chimie', label: 'Contrôle — Mélanges', value: 9, outOf: 20, coef: 2, classAvg: 10.2, date: '2026-09-29' },
  { period: 'A001', id: 'g7', subject: 'Espagnol', label: 'Vocabulaire', value: 13, outOf: 20, coef: 1, classAvg: 13.2, date: '2026-10-01' },
  { period: 'A001', id: 'g8', subject: 'EPS', label: 'Course d’endurance', value: 14, outOf: 20, coef: 1, classAvg: 13.5, date: '2026-10-03' },
  { period: 'A001', id: 'g9', subject: 'Mathématiques', label: 'DM — Géométrie', value: 15, outOf: 20, coef: 1, classAvg: 13.4, date: '2026-10-06' },
  { period: 'A001', id: 'g10', subject: 'Anglais', label: 'Oral', value: 16, outOf: 20, coef: 1, classAvg: 13.2, date: '2026-10-08' },
  { period: 'A001', id: 'g11', subject: 'Français', label: 'Dictée', value: 8, outOf: 10, coef: 1, classAvg: 6.0, date: '2026-10-10' },
  { period: 'A001', id: 'g12', subject: 'Espagnol', label: 'Expression écrite', value: 17, outOf: 20, coef: 1, classAvg: 13.8, date: '2026-10-12' },
  { period: 'A001', id: 'g13', subject: 'Physique-Chimie', label: 'Contrôle — Ions', value: 6, outOf: 20, coef: 2, classAvg: 10.4, date: '2026-10-14' },
  { period: 'A001', id: 'g14', subject: 'Histoire-Géo', label: 'Évaluation — Guerres', value: 7, outOf: 20, coef: 1, classAvg: 11.9, date: '2026-10-16' },
  { period: 'A001', id: 'g15', subject: 'Mathématiques', label: 'Interro surprise', value: 5, outOf: 20, coef: 2, classAvg: 11.0, date: '2026-10-17' },
  { period: 'A001', id: 'g16', subject: 'Mathématiques', label: 'DM — Fonctions', value: 19, outOf: 20, coef: 1, classAvg: 14.1, date: '2026-10-20' },
  { period: 'A001', id: 'g17', subject: 'SVT', label: 'TP — Génétique', value: 16, outOf: 20, coef: 1, classAvg: 12.9, date: '2026-10-22' },
  { period: 'A001', id: 'g18', subject: 'Histoire-Géo', label: 'Exposé', value: 19, outOf: 20, coef: 1, classAvg: 14.0, date: '2026-10-24' },
  { period: 'A001', id: 'g19', subject: 'Physique-Chimie', label: 'TP — Circuits', value: 18, outOf: 20, coef: 1, classAvg: 12.6, date: '2026-10-26' },
  { period: 'A001', id: 'g20', subject: 'EPS', label: 'Gymnastique', value: 18, outOf: 20, coef: 1, classAvg: 14.0, date: '2026-10-27' },
  { period: 'A001', id: 'g21', subject: 'Français', label: 'Rédaction — Récit', value: 17, outOf: 20, coef: 2, classAvg: 11.8, date: '2026-10-28' },
  { period: 'A001', id: 'g22', subject: 'Anglais', label: 'Compréhension orale', value: 18, outOf: 20, coef: 1, classAvg: 13.5, date: '2026-10-29' },
  { period: 'A001', id: 'g23', subject: 'SVT', label: 'Contrôle — Évolution', value: 8, outOf: 20, coef: 2, classAvg: 11.6, date: '2026-10-30' },
  { period: 'A001', id: 'g24', subject: 'Espagnol', label: 'Dialogue', value: 10, outOf: 20, coef: 1, classAvg: 13.0, date: '2026-10-31' },
  { period: 'A001', id: 'g25', subject: 'Anglais', label: 'Grammaire', value: 11, outOf: 20, coef: 1, classAvg: 13.0, date: '2026-11-02' },
  { period: 'A001', id: 'g26', subject: 'Mathématiques', label: 'Contrôle — Fonctions', value: 20, outOf: 20, coef: 2, classAvg: 12.4, date: '2026-11-03' },
  { period: 'A001', id: 'g27', subject: 'Physique-Chimie', label: 'Contrôle — Atomes', value: 18, outOf: 20, coef: 2, classAvg: 10.7, date: '2026-11-04' },
  { period: 'A001', id: 'g28', subject: 'SVT', label: 'Évaluation — ADN', value: 19, outOf: 20, coef: 1, classAvg: 13.0, date: '2026-11-05' },
  { period: 'A001', id: 'g29', subject: 'Espagnol', label: 'Vocabulaire', value: 19, outOf: 20, coef: 1, classAvg: 15.0, date: '2026-11-06' },
  { period: 'A001', id: 'g30', subject: 'Anglais', label: 'Oral final', value: 19, outOf: 20, coef: 1, classAvg: 13.5, date: '2026-11-07' },
  { period: 'A001', id: 'g31', subject: 'Français', label: 'Contrôle — Poésie', value: 18, outOf: 20, coef: 2, classAvg: 11.5, date: '2026-11-08' },
]

const lessons: Lesson[] = [
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

const homework: Homework[] = [
  { id: 'h1', subject: 'Mathématiques', title: 'Exercices 12 à 15 p. 84', due: '2026-11-10', done: false },
  { id: 'h2', subject: 'Français', title: 'Lire le chapitre 3 du Horla', due: '2026-11-11', done: false },
  { id: 'h3', subject: 'Anglais', title: 'Apprendre le vocabulaire unit 4', due: '2026-11-12', done: true },
  { id: 'h4', subject: 'SVT', test: true, title: 'Évaluation — génétique', due: '2026-11-13', done: false },
  { id: 'h5', subject: 'Histoire-Géo', title: 'Fiche de révision — 1ère GM', due: '2026-11-17', done: false },
]

const messages: Message[] = [
  { id: 'm1', subject: 'Sortie au musée d’Orsay — autorisation', from: 'Mme PETIT Claire', date: '2026-11-09 08:12:00', read: false, hasFiles: true },
  { id: 'm2', subject: 'Contrôle de mathématiques décalé', from: 'M. BERNARD Paul', date: '2026-11-08 17:40:00', read: false, hasFiles: false },
  { id: 'm3', subject: 'Réunion parents-professeurs du 3 décembre', from: 'Vie scolaire', date: '2026-11-06 11:05:00', read: true, hasFiles: true },
  { id: 'm4', subject: 'Résultats du concours de lecture', from: 'Mme PETIT Claire', date: '2026-11-03 09:30:00', read: true, hasFiles: false },
  { id: 'm5', subject: 'Menus de la semaine', from: 'Restauration scolaire', date: '2026-10-30 07:55:00', read: true, hasFiles: false },
]

export const demoMessageDetails: Record<string, MessageDetail> = {
  m1: { id: 'm1', subject: messages[0].subject, from: messages[0].from, to: ['Camille MARTIN'], date: messages[0].date, files: ['Autorisation_sortie.pdf'],
    body: 'Bonjour,\n\nLa classe de 3ème B se rendra au musée d’Orsay le jeudi 20 novembre.\n\nMerci de rapporter l’autorisation signée avant le mardi 18 novembre.\n\nCordialement,\nMme Petit' },
  m2: { id: 'm2', subject: messages[1].subject, from: messages[1].from, to: ['Camille MARTIN'], date: messages[1].date, files: [],
    body: 'Bonjour à tous,\n\nLe contrôle sur les fonctions est décalé au vendredi 14 novembre.\nPensez à réviser :\n• le vocabulaire (image, antécédent)\n• les exercices 12 à 15 p. 84\n\nBon courage !' },
  m3: { id: 'm3', subject: messages[2].subject, from: messages[2].from, to: ['Parents et élèves de 3ème B'], date: messages[2].date, files: ['Planning_reunions.pdf'],
    body: 'Chers parents,\n\nLa réunion parents-professeurs aura lieu le mercredi 3 décembre de 17 h à 19 h 30.\nLes créneaux sont à réserver auprès de la vie scolaire.' },
  m4: { id: 'm4', subject: messages[3].subject, from: messages[3].from, to: ['Camille MARTIN'], date: messages[3].date, files: [],
    body: 'Félicitations à tous les participants du concours de lecture ! Les résultats seront affichés au CDI.' },
  m5: { id: 'm5', subject: messages[4].subject, from: messages[4].from, to: ['Élèves demi-pensionnaires'], date: messages[4].date, files: [],
    body: 'Les menus de la semaine sont disponibles à l’accueil du restaurant scolaire.' },
}

export const demoData: SchoolData = {
  student,
  periods: [
    { code: 'A001', label: '1er trimestre', start: '2026-09-01', end: '2026-11-30' },
    { code: 'A002', label: '2e trimestre', start: '2026-12-01', end: '2027-03-06' },
    { code: 'A003', label: '3e trimestre', start: '2027-03-07', end: '2027-07-04' },
  ],
  currentPeriod: 'A001',
  grades,
  lessons,
  homework,
  messages,
}
