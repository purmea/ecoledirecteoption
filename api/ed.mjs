// Vercel : proxy École Directe, appelé en /api/ed?p=v3/....awp (même code que npm start).
import { edProxy } from '../server/ed-proxy.mjs'

const proxy = edProxy('/ed')

export default function handler(req, res) {
  return proxy(req, res, () => { res.statusCode = 404; res.end('Introuvable') })
}
