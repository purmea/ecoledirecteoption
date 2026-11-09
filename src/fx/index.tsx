// Petites briques d'interaction : chiffres qui défilent, messages courts, confettis, vibration.
import { useEffect, useRef, useState } from 'react'

const reduced = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Fait défiler un nombre de 0 (ou de sa valeur précédente) jusqu'à `value`. */
export function useCountUp(value: number | null, duration = 900) {
  const [shown, setShown] = useState(value === null || reduced() ? value : 0)
  const from = useRef(0)
  useEffect(() => {
    if (value === null) return setShown(null)
    if (reduced()) return setShown(value)
    const start = performance.now()
    const a = from.current
    let raf = 0
    const tick = (t: number) => {
      const k = Math.min(1, (t - start) / duration)
      const e = 1 - Math.pow(1 - k, 3)
      setShown(a + (value - a) * e)
      if (k < 1) raf = requestAnimationFrame(tick)
      else from.current = value
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, duration])
  return shown
}

/** Petite vibration (Android ; ignorée ailleurs). */
export const haptic = (ms = 10) => {
  try { navigator.vibrate?.(ms) } catch { /* non pris en charge */ }
}

// --- Messages courts, façon « Dynamic Island » ------------------------------

type ToastIcon = 'check' | 'party' | 'link'
type Toast = { id: number; text: string; icon: ToastIcon; leaving: boolean }
const TOAST = 'edo:toast'
export const toast = (text: string, icon: ToastIcon = 'check') =>
  window.dispatchEvent(new CustomEvent(TOAST, { detail: { text, icon } }))

const SHOW_MS = 2200
const LEAVE_MS = 320

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    let n = 0
    const on = (e: Event) => {
      const { text, icon } = (e as CustomEvent<{ text: string; icon: ToastIcon }>).detail
      const id = ++n
      // Un seul message à la fois, comme l'île dynamique : le nouveau remplace l'ancien.
      setItems([{ id, text, icon, leaving: false }])
      setTimeout(() => setItems((xs) => xs.map((x) => (x.id === id ? { ...x, leaving: true } : x))), SHOW_MS)
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), SHOW_MS + LEAVE_MS)
    }
    window.addEventListener(TOAST, on)
    return () => window.removeEventListener(TOAST, on)
  }, [])
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast ${t.leaving ? 'leaving' : ''}`}>
          <span className={`toast-ico ico-${t.icon}`} aria-hidden="true">
            {t.icon === 'check' && (
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" className="bg" /><path d="M7 12.5l3.2 3.2L17 8.8" className="tick" pathLength={1} /></svg>
            )}
            {t.icon === 'party' && <span className="party">🎉</span>}
            {t.icon === 'link' && (
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="11" className="bg" /><path d="M10 14a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1M14 10a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" className="stroke" /></svg>
            )}
          </span>
          <span className="toast-text">{t.text}</span>
        </div>
      ))}
    </div>
  )
}

// --- Confettis ---------------------------------------------------------------

const CONFETTI = 'edo:confetti'
export const celebrate = () => { if (!reduced()) window.dispatchEvent(new Event(CONFETTI)) }

export function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)
  const [on, setOn] = useState(0)
  useEffect(() => {
    const go = () => setOn((x) => x + 1)
    window.addEventListener(CONFETTI, go)
    return () => window.removeEventListener(CONFETTI, go)
  }, [])
  useEffect(() => {
    const c = ref.current
    if (!on || !c) return
    const dpr = Math.min(2, devicePixelRatio || 1)
    const w = (c.width = innerWidth * dpr)
    const h = (c.height = innerHeight * dpr)
    const ctx = c.getContext('2d')!
    const colors = ['#2a78d6', '#1baf7a', '#eda100', '#e87ba4', '#6250d6', '#eb6834']
    const parts = Array.from({ length: 140 }, () => ({
      x: w / 2 + (Math.random() - 0.5) * w * 0.2, y: h * 0.62,
      vx: (Math.random() - 0.5) * 22 * dpr, vy: -(10 + Math.random() * 16) * dpr,
      s: (4 + Math.random() * 5) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
      c: colors[(Math.random() * colors.length) | 0],
    }))
    let raf = 0
    const start = performance.now()
    const frame = (t: number) => {
      ctx.clearRect(0, 0, w, h)
      const life = (t - start) / 1800
      for (const p of parts) {
        p.vy += 0.55 * dpr
        p.vx *= 0.985
        p.x += p.vx
        p.y += p.vy
        p.r += p.vr
        ctx.save()
        ctx.globalAlpha = Math.max(0, 1 - life)
        ctx.translate(p.x, p.y)
        ctx.rotate(p.r)
        ctx.fillStyle = p.c
        ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2)
        ctx.restore()
      }
      if (life < 1) raf = requestAnimationFrame(frame)
      else ctx.clearRect(0, 0, w, h)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [on])
  return <canvas ref={ref} className="confetti" aria-hidden="true" />
}

/** Nombre qui défile jusqu'à sa valeur, avec le même nombre de décimales que la valeur finale. */
export function CountUp({ value }: { value: number }) {
  const v = useCountUp(value) ?? value
  const dec = (value.toLocaleString('fr-FR', { maximumFractionDigits: 2 }).split(',')[1] ?? '').length
  return <>{v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}</>
}
