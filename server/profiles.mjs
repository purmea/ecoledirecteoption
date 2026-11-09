// Profils publics (façon guns.lol) : pseudo unique, photo, bio, widgets.
//
// Stockage : un fichier JSON (data/profiles.json, ou $DATA_DIR/profiles.json).
// Propriété : un profil appartient à un compte élève École Directe. Le proxy
// (ed-proxy.mjs) appelle `bindSession` quand un login réussit, ce qui lie l'identifiant
// de session de l'appareil (en-tête X-Session, aléatoire) au compte. Seule une session
// liée peut créer ou modifier le profil de ce compte.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_FILE = join(process.env.DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url)), 'profiles.json')
const MAX_BODY = 400 * 1024
const HANDLE_RE = /^[a-z0-9_.]{3,20}$/
const RESERVED = new Set(['admin', 'api', 'app', 'ed', 'help', 'login', 'moderation', 'profil', 'root', 'settings', 'support', 'www', 'ecoledirecte'])
export const THEMES = ['aurora', 'ocean', 'sunset', 'forest', 'mono']
export const WIDGET_TYPES = ['average', 'subject', 'trend', 'subjects', 'homework']

/** @type {{ profiles: Record<string, any>, sessions: Record<string, { account: string, at: number }> }} */
let db = { profiles: {}, sessions: {} }
let loaded = null
let writing = Promise.resolve()

function load() {
  loaded ??= readFile(DATA_FILE, 'utf8')
    .then((t) => { db = { profiles: {}, sessions: {}, ...JSON.parse(t) } })
    .catch(() => {})
  return loaded
}

function persist() {
  const snapshot = JSON.stringify(db)
  writing = writing.then(async () => {
    await mkdir(dirname(DATA_FILE), { recursive: true })
    const tmp = DATA_FILE + '.tmp'
    await writeFile(tmp, snapshot)
    await rename(tmp, DATA_FILE)
  }).catch((e) => console.error('[profils] écriture impossible :', e))
  return writing
}

/** Appelé par le proxy après un login réussi : cette session agit pour ce compte. */
export async function bindSession(sessionId, accountId) {
  await load()
  db.sessions[sessionId] = { account: String(accountId), at: Date.now() }
  await persist()
}

// --- validation -------------------------------------------------------------

const str = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max) : '')
const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? Math.round(v * 100) / 100 : null)

export function handleProblem(h) {
  if (!HANDLE_RE.test(h)) return '3 à 20 caractères : lettres minuscules, chiffres, « _ » ou « . »'
  if (RESERVED.has(h)) return 'Ce pseudo est réservé'
  return null
}

function cleanProfile(input) {
  const p = input && typeof input === 'object' ? input : {}
  const avatar = typeof p.avatar === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(p.avatar) && p.avatar.length < 300_000
    ? p.avatar : null
  const widgets = (Array.isArray(p.widgets) ? p.widgets : []).slice(0, 8)
    .filter((w) => w && WIDGET_TYPES.includes(w.type))
    .map((w) => ({ id: str(w.id, 24) || Math.random().toString(36).slice(2, 10), type: w.type, ...(w.type === 'subject' ? { subject: str(w.subject, 60) } : {}) }))
  const s = p.snapshot && typeof p.snapshot === 'object' ? p.snapshot : {}
  const snapshot = {
    period: str(s.period, 40),
    average: num(s.average),
    trend: (Array.isArray(s.trend) ? s.trend : []).slice(-40).map(num).filter((v) => v !== null),
    subjects: (Array.isArray(s.subjects) ? s.subjects : []).slice(0, 30).map((x) => ({
      subject: str(x?.subject, 60), average: num(x?.average), classAverage: num(x?.classAverage),
    })).filter((x) => x.subject && x.average !== null),
    homeworkLeft: num(s.homeworkLeft),
    updatedAt: new Date().toISOString(),
  }
  return {
    handle: str(p.handle, 20).toLowerCase(),
    displayName: str(p.displayName, 32),
    bio: str(p.bio, 140),
    avatar,
    theme: THEMES.includes(p.theme) ? p.theme : 'aurora',
    widgets,
    snapshot,
  }
}

const publicView = (p) => ({ ...p, account: undefined })

// --- HTTP -------------------------------------------------------------------

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(JSON.stringify(body))
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { reject(new Error('Profil trop volumineux (photo trop lourde ?)')); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => { try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) } catch { reject(new Error('JSON invalide')) } })
    req.on('error', reject)
  })
}

const findByAccount = (account) => Object.values(db.profiles).find((p) => p.account === account)

/**
 * Routes :
 *   GET  /api/u/:pseudo           profil public (+1 vue)
 *   GET  /api/handles/:pseudo     { available, reason? }
 *   GET  /api/me/profile          profil du compte connecté (ou null)
 *   PUT  /api/me/profile          crée / met à jour (changement de pseudo compris)
 *   DELETE /api/me/profile        supprime le profil
 */
export function profilesApi(prefix = '/api') {
  return async (req, res, next) => {
    if (!req.url?.startsWith(prefix + '/')) return next()
    await load()
    const path = new URL(req.url, 'http://x').pathname.slice(prefix.length)
    try {
      let m
      if (req.method === 'GET' && (m = path.match(/^\/u\/([^/]+)$/))) {
        const p = db.profiles[decodeURIComponent(m[1]).toLowerCase()]
        if (!p) return send(res, 404, { error: 'Profil introuvable' })
        p.views = (p.views ?? 0) + 1
        void persist()
        return send(res, 200, publicView(p))
      }
      if (req.method === 'GET' && (m = path.match(/^\/handles\/([^/]+)$/))) {
        const h = decodeURIComponent(m[1]).toLowerCase()
        const reason = handleProblem(h)
        if (reason) return send(res, 200, { available: false, reason })
        const owner = db.profiles[h]
        const me = db.sessions[String(req.headers['x-session'] ?? '')]?.account
        return send(res, 200, owner && owner.account !== me ? { available: false, reason: 'Déjà pris' } : { available: true })
      }
      if (path === '/me/profile') {
        const me = db.sessions[String(req.headers['x-session'] ?? '')]?.account
        if (!me) return send(res, 401, { error: 'Connecte-toi avec ton compte École Directe pour avoir un profil public.' })
        const current = findByAccount(me)
        if (req.method === 'GET') return send(res, 200, current ? publicView(current) : null)
        if (req.method === 'DELETE') {
          if (current) delete db.profiles[current.handle]
          await persist()
          return send(res, 200, { ok: true })
        }
        if (req.method === 'PUT') {
          const next = cleanProfile(await readJson(req))
          const reason = handleProblem(next.handle)
          if (reason) return send(res, 400, { error: `Pseudo invalide : ${reason}` })
          const taken = db.profiles[next.handle]
          if (taken && taken.account !== me) return send(res, 409, { error: 'Ce pseudo est déjà pris' })
          if (current && current.handle !== next.handle) delete db.profiles[current.handle]
          db.profiles[next.handle] = { ...next, account: me, views: current?.views ?? 0, createdAt: current?.createdAt ?? new Date().toISOString() }
          await persist()
          return send(res, 200, publicView(db.profiles[next.handle]))
        }
      }
      return send(res, 404, { error: 'Route inconnue' })
    } catch (e) {
      return send(res, 400, { error: e instanceof Error ? e.message : String(e) })
    }
  }
}
