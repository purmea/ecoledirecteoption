// Profils publics : API du serveur de l'app, avec repli local (mode démo / version statique).
import { proxySession } from '../api/client'
import type { SchoolData } from '../types'
import { averageTimeline, generalAverage, groupBySubject } from '../lib'
import { withDefaults, type Profile, type Snapshot } from './types'

const notifyChanged = () => window.dispatchEvent(new Event('edo:profile-changed'))

const LOCAL_KEY = 'edo:profile'
/** Compteur de vues fixe du profil de démonstration (fictif, comme les notes de la démo). */
const DEMO_VIEWS = 5371

export class ProfileError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`./api${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', 'X-Session': proxySession(), ...init.headers },
    })
  } catch {
    throw new ProfileError(0, 'Serveur injoignable')
  }
  let json: unknown
  try {
    json = await res.json()
  } catch {
    throw new ProfileError(res.status || 404, 'Les profils publics nécessitent le serveur de l’app.')
  }
  if (!res.ok) throw new ProfileError(res.status, (json as { error?: string })?.error ?? `Erreur ${res.status}`)
  return json as T
}

/** Local (démo) : le profil vit uniquement sur cet appareil. */
export const local = {
  get(): Profile | null {
    try {
      const p = JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null')
      return p ? withDefaults({ ...p, views: DEMO_VIEWS }) : null
    } catch { return null }
  },
  set(p: Profile) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)) } catch { throw new ProfileError(0, 'Stockage plein : essaie une photo plus légère.') }
  },
  clear() {
    try { localStorage.removeItem(LOCAL_KEY) } catch { /* ignoré */ }
  },
}

export async function getMyProfile(mode: 'demo' | 'live'): Promise<Profile | null> {
  if (mode === 'demo') return local.get()
  const p = await call<Profile | null>('/me/profile')
  return p ? withDefaults(p) : null
}

export async function saveProfile(mode: 'demo' | 'live', p: Profile): Promise<Profile> {
  if (mode === 'demo') {
    const prev = local.get()
    const saved = { ...p, views: DEMO_VIEWS, createdAt: prev?.createdAt ?? new Date().toISOString(), snapshot: { ...p.snapshot, updatedAt: new Date().toISOString() } }
    local.set(saved)
    notifyChanged()
    return saved
  }
  const saved = withDefaults(await call<Profile>('/me/profile', { method: 'PUT', body: JSON.stringify(p) }))
  notifyChanged()
  return saved
}

export async function deleteProfile(mode: 'demo' | 'live') {
  if (mode === 'demo') local.clear()
  else await call('/me/profile', { method: 'DELETE' })
  notifyChanged()
}

export async function checkHandle(mode: 'demo' | 'live', handle: string): Promise<{ available: boolean; reason?: string }> {
  if (!/^[a-z0-9_.]{3,20}$/.test(handle)) return { available: false, reason: '3 à 20 caractères : a-z, 0-9, « _ » ou « . »' }
  if (mode === 'demo') return { available: true }
  return call(`/handles/${encodeURIComponent(handle)}`)
}

/** Profil public : serveur d'abord, sinon profil local si le pseudo correspond. */
export async function getPublicProfile(handle: string): Promise<Profile> {
  try {
    return withDefaults(await call<Profile>(`/u/${encodeURIComponent(handle)}`))
  } catch (e) {
    const mine = local.get()
    if (mine?.handle === handle) return mine
    throw e
  }
}

export function buildSnapshot(data: SchoolData): Snapshot {
  const grades = data.grades.filter((g) => g.period === data.currentPeriod)
  return {
    period: data.periods.find((p) => p.code === data.currentPeriod)?.label ?? '',
    average: generalAverage(grades),
    trend: averageTimeline(grades).map((p) => Math.round(p.value * 100) / 100),
    subjects: groupBySubject(grades).map((s) => ({ subject: s.subject, average: s.average, classAverage: s.classAverage })),
    homeworkLeft: data.homework.filter((h) => !h.done).length,
  }
}

/** Pseudo proposé à partir du prénom/nom : « camille.martin ». */
export function suggestHandle(first: string, last: string) {
  const clean = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
  return [clean(first), clean(last)].filter(Boolean).join('.').slice(0, 20) || 'eleve'
}

/** Recadre une image en carré et la compresse (photo de profil légère). */
export async function imageToAvatar(file: File, size = 320): Promise<string> {
  if (!file.type.startsWith('image/')) throw new ProfileError(0, 'Choisis une image.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new ProfileError(0, 'Image illisible.'))
      i.src = url
    })
    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')!
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size)
    const webp = canvas.toDataURL('image/webp', 0.85)
    return webp.startsWith('data:image/webp') ? webp : canvas.toDataURL('image/jpeg', 0.85)
  } finally {
    URL.revokeObjectURL(url)
  }
}

// --- Médias ----------------------------------------------------------------

const DEMO_MAX = 2e6

function fileToDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result))
    r.onerror = () => reject(new ProfileError(0, 'Lecture du fichier impossible.'))
    r.readAsDataURL(file)
  })
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  return new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => { URL.revokeObjectURL(url); resolve(i) }
    i.onerror = () => { URL.revokeObjectURL(url); reject(new ProfileError(0, 'Image illisible.')) }
    i.src = url
  })
}

/** Redimensionne une image (sans recadrage) et la convertit en WebP. Les GIF restent animés. */
async function shrinkImage(file: File, maxSide: number): Promise<Blob> {
  if (file.type === 'image/gif') return file
  const img = await loadImage(file)
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.naturalWidth * scale)
  canvas.height = Math.round(img.naturalHeight * scale)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b ?? file), 'image/webp', 0.82))
}

/** Envoie un média : sur le serveur (compte réel) ou en data URL (démo, 2 Mo max). */
async function upload(mode: 'demo' | 'live', blob: Blob): Promise<string> {
  if (mode === 'demo') {
    if (blob.size > DEMO_MAX) throw new ProfileError(0, 'En mode démo, les fichiers sont limités à 2 Mo (ils restent sur ton appareil).')
    return fileToDataUrl(blob)
  }
  let res: Response
  try {
    res = await fetch('./api/media', { method: 'POST', headers: { 'Content-Type': blob.type, 'X-Session': proxySession() }, body: blob })
  } catch {
    throw new ProfileError(0, 'Envoi impossible : serveur injoignable.')
  }
  const json = await res.json().catch(() => ({}))
  if (!res.ok) throw new ProfileError(res.status, json.error ?? `Envoi refusé (${res.status})`)
  return json.url
}

export async function uploadBackground(mode: 'demo' | 'live', file: File): Promise<Profile['background']> {
  if (file.type.startsWith('video/')) {
    if (!['video/mp4', 'video/webm'].includes(file.type)) throw new ProfileError(0, 'Vidéo : MP4 ou WebM uniquement.')
    return { url: await upload(mode, file), type: 'video' }
  }
  if (!file.type.startsWith('image/')) throw new ProfileError(0, 'Choisis une image ou une vidéo.')
  return { url: await upload(mode, await shrinkImage(file, 1920)), type: 'image' }
}

export async function uploadAudio(mode: 'demo' | 'live', file: File) {
  if (!file.type.startsWith('audio/')) throw new ProfileError(0, 'Choisis un fichier audio (MP3, M4A, OGG, WAV).')
  return upload(mode, file)
}

/** Curseur : 32 px maximum, en PNG (data URL, toujours léger). */
export async function cursorFromImage(file: File) {
  if (!file.type.startsWith('image/')) throw new ProfileError(0, 'Choisis une image.')
  const img = await loadImage(file)
  const scale = Math.min(1, 32 / Math.max(img.naturalWidth, img.naturalHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL('image/png')
}

/** Badges gagnés automatiquement à partir des moyennes. */
export function badgesFor(s: Snapshot) {
  const out: { id: string; label: string; icon: 'trophy' | 'star' | 'check' | 'trend' }[] = []
  if (s.average !== null) {
    if (s.average >= 16) out.push({ id: 'felicitations', label: 'Félicitations', icon: 'trophy' })
    else if (s.average >= 14) out.push({ id: 'compliments', label: 'Compliments', icon: 'star' })
    else if (s.average >= 12) out.push({ id: 'encouragements', label: 'Encouragements', icon: 'star' })
  }
  if (s.trend.length > 2 && s.trend[s.trend.length - 1] - s.trend[0] >= 0.5) out.push({ id: 'progression', label: 'En progression', icon: 'trend' })
  if (s.homeworkLeft === 0) out.push({ id: 'a-jour', label: 'Devoirs à jour', icon: 'check' })
  return out
}
