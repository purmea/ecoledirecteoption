// Petit serveur de production : sert dist/ et le proxy École Directe.
// Usage : npm run build && npm start   (PORT=8080 npm start pour changer de port)
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import { fileURLToPath } from 'node:url'
import { edProxy } from './ed-proxy.mjs'

const root = fileURLToPath(new URL('../dist/', import.meta.url))
const port = Number(process.env.PORT) || 8080
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.webmanifest': 'application/manifest+json',
  '.png': 'image/png',
}
const proxy = edProxy('/ed')

createServer((req, res) => {
  proxy(req, res, async () => {
    try {
      let path = normalize(decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname)).replace(/^([/\\])+/, '')
      if (path.startsWith('..')) throw new Error('interdit')
      let file = join(root, path)
      if (!(await stat(file).catch(() => null))?.isFile()) file = join(root, 'index.html')
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream')
      res.end(await readFile(file))
    } catch {
      res.statusCode = 404
      res.end('Introuvable')
    }
  })
}).listen(port, '0.0.0.0', () => console.log(`EcoleDirecte Option → http://localhost:${port}`))
