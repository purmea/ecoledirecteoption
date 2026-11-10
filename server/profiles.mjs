// Profils publics (façon guns.lol) : pseudo unique, photo, bio, widgets.
//
// Stockage : un fichier JSON (data/profiles.json, ou $DATA_DIR/profiles.json).
// Propriété : un profil appartient à un compte élève École Directe. Le proxy
// (ed-proxy.mjs) appelle `bindSession` quand un login réussit, ce qui lie l'identifiant
// de session de l'appareil (en-tête X-Session, aléatoire) au compte. Seule une session
// liée peut créer ou modifier le profil de ce compte.

import { createHash } from 'node:crypto'
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const DATA_DIR = process.env.DATA_DIR || fileURLToPath(new URL('../data/', import.meta.url))
const DATA_FILE = join(DATA_DIR, 'profiles.json')
const MEDIA_DIR = join(DATA_DIR, 'media')
const MAX_BODY = 600 * 1024
const HANDLE_RE = /^[a-z0-9_.]{3,20}$/
const RESERVED = new Set(['admin', 'api', 'app', 'ed', 'help', 'login', 'moderation', 'profil', 'root', 'settings', 'support', 'www', 'ecoledirecte'])
export const WIDGET_TYPES = ['average', 'subject', 'trend', 'subjects', 'homework']
const BG_EFFECTS = ['none', 'halos', 'rain', 'snow', 'stars', 'particles']
const NAME_EFFECTS = ['none', 'rainbow', 'typewriter', 'glitch', 'sparkles']

// Médias acceptés : type MIME → extension et taille maximale. Pas de SVG (risque de script).
const MEDIA_TYPES = {
  'image/webp': ['webp', 3e6], 'image/jpeg': ['jpg', 3e6], 'image/png': ['png', 3e6], 'image/gif': ['gif', 6e6],
  'video/mp4': ['mp4', 15e6], 'video/webm': ['webm', 15e6],
  'audio/mpeg': ['mp3', 10e6], 'audio/mp4': ['m4a', 10e6], 'audio/x-m4a': ['m4a', 10e6], 'audio/ogg': ['ogg', 10e6], 'audio/wav': ['wav', 10e6],
}
const EXT_TYPES = { webp: 'image/webp', jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', mp4: 'video/mp4', webm: 'video/webm', mp3: 'audio/mpeg', m4a: 'audio/mp4', ogg: 'audio/ogg', wav: 'audio/wav' }
const MEDIA_URL_RE = /^\.\/api\/media\/([a-f0-9]{32}\.(webp|jpg|png|gif|mp4|webm|mp3|m4a|ogg|wav))$/

/** @type {{ profiles: Record<string, any>, sessions: Record<string, { account: string, at: number }>, media: Record<string, { account: string, at: number }> }} */
let db = { profiles: {}, sessions: {}, media: {} }
let loaded = null
let writing = Promise.resolve()

function load() {
  loaded ??= readFile(DATA_FILE, 'utf8')
    .then((t) => {
      db = { profiles: {}, sessions: {}, media: {}, ...JSON.parse(t) }
      // Les profils créés avant l'option « public » étaient publiés : ils le restent.
      for (const p of Object.values(db.profiles)) if (p.public === undefined) p.public = true
    })
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

const HEX_RE = /^#[0-9a-f]{6}$/i
const color = (v, fallback) => (typeof v === 'string' && HEX_RE.test(v) ? v.toLowerCase() : fallback)
const bool = (v) => v === true
const int = (v, min, max, fallback) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : fallback)
const pick = (v, list, fallback) => (list.includes(v) ? v : fallback)

/** Image en data URL (petits fichiers : photo, curseur) ou média hébergé ici. */
function mediaRef(v, { dataMax = 0, kinds }) {
  if (typeof v !== 'string') return null
  if (dataMax && v.length <= dataMax && /^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) return v
  const m = MEDIA_URL_RE.exec(v)
  return m && kinds.includes(EXT_TYPES[m[2]].split('/')[0]) ? v : null
}

function cleanProfile(input) {
  const p = input && typeof input === 'object' ? input : {}
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
  const bg = p.background && typeof p.background === 'object' ? p.background : null
  const bgUrl = bg ? mediaRef(bg.url, { kinds: ['image', 'video'] }) : null
  const c = p.colors ?? {}, fx = p.effects ?? {}, g = p.glow ?? {}, o = p.options ?? {}
  return {
    handle: str(p.handle, 20).toLowerCase(),
    displayName: str(p.displayName, 32),
    bio: str(p.bio, 140),
    location: str(p.location, 40),
    enterText: str(p.enterText, 40) || 'clique pour entrer',
    avatar: mediaRef(p.avatar, { dataMax: 300_000, kinds: ['image'] }),
    background: bgUrl ? { url: bgUrl, type: bgUrl.match(/\.(mp4|webm)$/) ? 'video' : 'image' } : null,
    audio: mediaRef(p.audio, { kinds: ['audio'] }),
    cursor: mediaRef(p.cursor, { dataMax: 60_000, kinds: ['image'] }),
    public: bool(p.public),
    colors: {
      accent: color(c.accent, '#ffffff'), text: color(c.text, '#ffffff'),
      background: color(c.background, '#0a0a0a'), icons: color(c.icons, '#ffffff'),
    },
    effects: { background: pick(fx.background, BG_EFFECTS, 'none'), username: pick(fx.username, NAME_EFFECTS, 'none') },
    opacity: int(p.opacity, 0, 100, 7),
    blur: int(p.blur, 0, 80, 8),
    glow: { username: bool(g.username), badges: bool(g.badges), widgets: bool(g.widgets) },
    options: {
      animatedTitle: bool(o.animatedTitle), animatedBio: bool(o.animatedBio), invertBlocks: bool(o.invertBlocks),
      volumeControl: o.volumeControl !== false, showBadges: o.showBadges !== false,
      discordAvatar: bool(o.discordAvatar), discordDecoration: bool(o.discordDecoration), discordPresence: bool(o.discordPresence),
    },
    discordId: /^\d{15,21}$/.test(String(p.discordId ?? '')) ? String(p.discordId) : '',
    widgets,
    snapshot,
  }
}

/** Fichiers médias référencés par un profil. */
const mediaOf = (p) => [p?.avatar, p?.background?.url, p?.audio, p?.cursor]
  .map((u) => (typeof u === 'string' ? MEDIA_URL_RE.exec(u)?.[1] : null)).filter(Boolean)

/** Supprime les médias d'un compte qui ne sont plus utilisés (après 10 min, pour laisser le temps d'enregistrer). */
async function sweepMedia(account) {
  const used = new Set(Object.values(db.profiles).flatMap(mediaOf))
  for (const [file, m] of Object.entries(db.media)) {
    if (m.account === account && !used.has(file) && Date.now() - m.at > 10 * 60 * 1000) {
      delete db.media[file]
      await unlink(join(MEDIA_DIR, file)).catch(() => {})
    }
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

function readRaw(req, max) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > max) { reject(new Error(`Fichier trop lourd (max ${Math.round(max / 1e6)} Mo)`)); req.destroy() } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks)))
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
 *   POST /api/media               envoie un média (corps brut, Content-Type obligatoire)
 *   GET  /api/media/:fichier      sert un média
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
        const viewer = db.sessions[String(req.headers['x-session'] ?? '')]?.account
        const isOwner = !!p && viewer === p.account
        // Un profil privé n'existe que pour son propriétaire.
        if (!p || (!p.public && !isOwner)) return send(res, 404, { error: 'Profil introuvable' })
        if (!isOwner) { p.views = (p.views ?? 0) + 1; void persist() } // ses propres visites ne comptent pas
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
      if (req.method === 'GET' && (m = path.match(/^\/media\/([a-f0-9]{32}\.(\w+))$/))) {
        const type = EXT_TYPES[m[2]]
        if (!type || !db.media[m[1]]) return send(res, 404, { error: 'Média introuvable' })
        const buf = await readFile(join(MEDIA_DIR, m[1])).catch(() => null)
        if (!buf) return send(res, 404, { error: 'Média introuvable' })
        res.statusCode = 200
        res.setHeader('Content-Type', type)
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
        return res.end(buf)
      }
      if (req.method === 'POST' && path === '/media') {
        const me = db.sessions[String(req.headers['x-session'] ?? '')]?.account
        if (!me) return send(res, 401, { error: 'Connecte-toi avec ton compte École Directe pour envoyer des fichiers.' })
        const type = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
        const spec = MEDIA_TYPES[type]
        if (!spec) return send(res, 415, { error: 'Format non accepté (images, MP4/WebM, MP3/M4A/OGG/WAV)' })
        const buf = await readRaw(req, spec[1])
        if (!buf.length) return send(res, 400, { error: 'Fichier vide' })
        const file = `${createHash('sha256').update(buf).digest('hex').slice(0, 32)}.${spec[0]}`
        await mkdir(MEDIA_DIR, { recursive: true })
        await writeFile(join(MEDIA_DIR, file), buf)
        db.media[file] = { account: me, at: Date.now() }
        await persist()
        return send(res, 200, { url: `./api/media/${file}` })
      }
      if (path === '/me/profile') {
        const me = db.sessions[String(req.headers['x-session'] ?? '')]?.account
        if (!me) return send(res, 401, { error: 'Connecte-toi avec ton compte École Directe pour avoir un profil public.' })
        const current = findByAccount(me)
        if (req.method === 'GET') return send(res, 200, current ? publicView(current) : null)
        if (req.method === 'DELETE') {
          if (current) delete db.profiles[current.handle]
          await sweepMedia(me)
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
          // Un profil ne peut référencer que ses propres médias.
          for (const f of mediaOf(next)) if (db.media[f]?.account !== me) return send(res, 400, { error: 'Média invalide' })
          db.profiles[next.handle] = { ...next, account: me, views: current?.views ?? 0, createdAt: current?.createdAt ?? new Date().toISOString() }
          await sweepMedia(me)
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
