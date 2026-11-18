// Vercel : API des profils. Sans disque persistant, les profils ne survivent pas (stockage /tmp).
process.env.DATA_DIR ||= '/tmp/edo-data'
const { profilesApi } = await import('../server/profiles.mjs')
const api = profilesApi('/api')

export default function handler(req, res) {
  const u = new URL(req.url, 'http://x')
  const p = u.searchParams.get('p') ?? ''
  u.searchParams.delete('p')
  req.url = `/api/${p}${u.search}`
  return api(req, res, () => { res.statusCode = 404; res.end('Introuvable') })
}
