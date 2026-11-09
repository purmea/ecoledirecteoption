// Proxy vers l'API École Directe.
//
// Le navigateur ne peut pas appeler api.ecoledirecte.com directement : l'API ne
// gère pas le CORS et la connexion exige un cookie « GTK » qu'un script ne peut
// pas lire. Ce proxy tourne côté serveur (vite dev / vite preview / npm start),
// garde les cookies d'École Directe par session et ajoute les en-têtes attendus.
//
// Comportement calé sur la doc communautaire (EduWireApps/ecoledirecte-api-docs),
// y compris la PR #55 (capture du vrai site, 31/08/2026) : second cookie httponly
// posé avec GTK, en-tête 2FA-Token pendant le QCM.
//
// Seules les routes /v3/* de api.ecoledirecte.com sont relayées. Les identifiants
// ne sont jamais stockés : ils ne font que transiter vers École Directe.

// ED_API_ORIGIN permet de pointer vers un faux serveur pour les tests.
import { bindSession } from './profiles.mjs'

const ED_ORIGIN = process.env.ED_API_ORIGIN || 'https://api.ecoledirecte.com'
export const ED_VERSION = '4.75.0'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
const MAX_BODY = 64 * 1024
const JAR_TTL = 6 * 60 * 60 * 1000

/** @type {Map<string, { cookies: Map<string, string>, seen: number }>} */
const jars = new Map()

function jarFor(sessionId) {
  const now = Date.now()
  for (const [k, j] of jars) if (now - j.seen > JAR_TTL) jars.delete(k)
  let jar = jars.get(sessionId)
  if (!jar) jars.set(sessionId, (jar = { cookies: new Map(), seen: now }))
  jar.seen = now
  return jar
}

function storeCookies(jar, res) {
  for (const line of res.headers.getSetCookie?.() ?? []) {
    const [pair] = line.split(';')
    const i = pair.indexOf('=')
    if (i > 0) jar.cookies.set(pair.slice(0, i).trim(), pair.slice(i + 1).trim())
  }
}

const cookieHeader = (jar) => [...jar.cookies].map(([k, v]) => `${k}=${v}`).join('; ')

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) {
        reject(new Error('Requête trop volumineuse'))
        req.destroy()
      } else chunks.push(c)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function send(res, status, body) {
  res.statusCode = status
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.end(typeof body === 'string' ? body : JSON.stringify(body))
}

/** Récupère le cookie GTK requis avant chaque login (depuis mars 2025). */
async function fetchGtk(jar) {
  const r = await fetch(`${ED_ORIGIN}/v3/login.awp?gtk=1&v=${ED_VERSION}`, {
    headers: { 'User-Agent': USER_AGENT, Cookie: cookieHeader(jar) },
  })
  storeCookies(jar, r)
  await r.arrayBuffer()
  return jar.cookies.get('GTK')
}

/**
 * Middleware Connect/Node : gère les requêtes sur `${prefix}/v3/...`.
 * @param {string} prefix
 */
export function edProxy(prefix = '/ed') {
  return async (req, res, next) => {
    if (!req.url?.startsWith(prefix + '/')) return next()
    // Permet à l'app de vérifier que le serveur (et donc la connexion) est disponible.
    if (req.url === `${prefix}/health`) return send(res, 200, { ok: true, version: ED_VERSION })
    if (req.method !== 'POST') return send(res, 405, { code: 405, message: 'Méthode non autorisée' })

    const url = new URL(req.url.slice(prefix.length), 'http://local')
    if (!/^\/v3\/[\w/.-]+\.awp$/.test(url.pathname) || url.pathname.includes('..')) {
      return send(res, 400, { code: 400, message: 'Route non autorisée' })
    }
    const sessionId = String(req.headers['x-session'] ?? '')
    if (!/^[\w-]{8,64}$/.test(sessionId)) return send(res, 400, { code: 400, message: 'Session manquante' })

    try {
      const body = await readBody(req)
      const jar = jarFor(sessionId)
      const headers = {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/plain, */*',
      }
      const token = req.headers['x-token']
      if (typeof token === 'string' && token) headers['X-Token'] = token
      const twoFa = req.headers['2fa-token']
      if (typeof twoFa === 'string' && twoFa) headers['2FA-Token'] = twoFa

      if (url.pathname === '/v3/login.awp') {
        // Nouveau login : on repart d'un pot à cookies vide. La route GTK pose GTK + un second
        // cookie au nom aléatoire ; il faut renvoyer les deux, sinon le login échoue en 505.
        jar.cookies.clear()
        const gtk = await fetchGtk(jar)
        if (gtk) headers['X-Gtk'] = gtk
      }
      if (jar.cookies.size) headers.Cookie = cookieHeader(jar)

      url.searchParams.set('v', ED_VERSION)
      const upstream = await fetch(`${ED_ORIGIN}${url.pathname}${url.search}`, { method: 'POST', headers, body })
      storeCookies(jar, upstream)
      const text = await upstream.text()
      // Journal sans données sensibles : route, statut HTTP et code École Directe.
      const edCode = /"code"\s*:\s*(\d+)/.exec(text)?.[1] ?? '?'
      console.log(`[ed] ${url.pathname} → HTTP ${upstream.status}, code ${edCode}${edCode === '?' ? ` (${JSON.stringify(text.slice(0, 120))})` : ''}`)
      // Login réussi : cette session (appareil) est désormais liée au compte élève, ce qui
      // l'autorise à gérer le profil public de ce compte (voir profiles.mjs).
      if (url.pathname === '/v3/login.awp' && edCode === '200') {
        try {
          const account = JSON.parse(text)?.data?.accounts?.find((a) => a.typeCompte === 'E')
          if (account?.id) await bindSession(sessionId, account.id)
        } catch { /* réponse inattendue : pas de liaison */ }
      }
      const newToken = upstream.headers.get('x-token')
      if (newToken) res.setHeader('X-Token', newToken)
      const newTwoFa = upstream.headers.get('2fa-token')
      if (newTwoFa) res.setHeader('2FA-Token', newTwoFa)
      send(res, upstream.ok ? 200 : 502, upstream.ok ? text : { code: upstream.status, message: 'École Directe ne répond pas' })
    } catch (err) {
      console.error(`[ed] ${url.pathname} → échec : ${err instanceof Error ? (err.cause ?? err.message) : err}`)
      send(res, 502, { code: 502, message: `Impossible de joindre École Directe (${err instanceof Error ? err.message : err})` })
    }
  }
}
