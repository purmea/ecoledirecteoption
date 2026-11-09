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

// --- Messages courts (toasts) ----------------------------------------------

type Toast = { id: number; text: string }
const TOAST = 'edo:toast'
export const toast = (text: string) => window.dispatchEvent(new CustomEvent(TOAST, { detail: text }))

export function Toaster() {
  const [items, setItems] = useState<Toast[]>([])
  useEffect(() => {
    let n = 0
    const on = (e: Event) => {
      const id = ++n
      setItems((xs) => [...xs.slice(-2), { id, text: (e as CustomEvent<string>).detail }])
      setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 2400)
    }
    window.addEventListener(TOAST, on)
    return () => window.removeEventListener(TOAST, on)
  }, [])
  return (
    <div className="toaster" role="status" aria-live="polite">
      {items.map((t) => <div key={t.id} className="toast">{t.text}</div>)}
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
