// Profils publics : API du serveur de l'app, avec repli local (mode démo / version statique).
import { proxySession } from '../api/client'
import type { SchoolData } from '../types'
import { averageTimeline, generalAverage, groupBySubject } from '../lib'
import type { Profile, Snapshot } from './types'

const LOCAL_KEY = 'edo:profile'

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
    try { return JSON.parse(localStorage.getItem(LOCAL_KEY) ?? 'null') } catch { return null }
  },
  set(p: Profile) {
    try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)) } catch { throw new ProfileError(0, 'Stockage plein : essaie une photo plus légère.') }
  },
  clear() {
    try { localStorage.removeItem(LOCAL_KEY) } catch { /* ignoré */ }
  },
}

export function getMyProfile(mode: 'demo' | 'live'): Promise<Profile | null> {
  return mode === 'demo' ? Promise.resolve(local.get()) : call<Profile | null>('/me/profile')
}

export async function saveProfile(mode: 'demo' | 'live', p: Profile): Promise<Profile> {
  if (mode === 'demo') {
    const saved = { ...p, views: local.get()?.views ?? 0, snapshot: { ...p.snapshot, updatedAt: new Date().toISOString() } }
    local.set(saved)
    return saved
  }
  return call<Profile>('/me/profile', { method: 'PUT', body: JSON.stringify(p) })
}

export function deleteProfile(mode: 'demo' | 'live') {
  if (mode === 'demo') return Promise.resolve(local.clear())
  return call('/me/profile', { method: 'DELETE' })
}

export async function checkHandle(mode: 'demo' | 'live', handle: string): Promise<{ available: boolean; reason?: string }> {
  if (!/^[a-z0-9_.]{3,20}$/.test(handle)) return { available: false, reason: '3 à 20 caractères : a-z, 0-9, « _ » ou « . »' }
  if (mode === 'demo') return { available: true }
  return call(`/handles/${encodeURIComponent(handle)}`)
}

/** Profil public : serveur d'abord, sinon profil local si le pseudo correspond. */
export async function getPublicProfile(handle: string): Promise<Profile> {
  try {
    return await call<Profile>(`/u/${encodeURIComponent(handle)}`)
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
