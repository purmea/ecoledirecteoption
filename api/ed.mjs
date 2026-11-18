// Vercel : relaie /ed/* vers le proxy École Directe (même code que npm start).
import { edProxy } from '../server/ed-proxy.mjs'

const proxy = edProxy('/ed')

export default function handler(req, res) {
  const u = new URL(req.url, 'http://x')
  const p = u.searchParams.get('p') ?? ''
  u.searchParams.delete('p')
  req.url = `/ed/${p}${u.search}`
  return proxy(req, res, () => { res.statusCode = 404; res.end('Introuvable') })
}
