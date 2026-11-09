import { useEffect, useRef } from 'react'
import type { BgEffect } from './types'

interface P { x: number; y: number; vx: number; vy: number; r: number; a: number; t: number }

/** Effets d'arrière-plan animés (pluie, neige, étoiles, particules) dans un canvas. */
export function EffectCanvas({ effect, color }: { effect: BgEffect; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas || effect === 'none' || effect === 'halos') return
    const ctx = canvas.getContext('2d')!
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
    let w = 0
    let h = 0
    let parts: P[] = []
    let raf = 0
    const dpr = Math.min(2, window.devicePixelRatio || 1)

    const spawn = (initial: boolean): P => {
      const x = Math.random() * w
      const y = initial ? Math.random() * h : -10
      switch (effect) {
        case 'rain': return { x, y, vx: -0.6, vy: 9 + Math.random() * 6, r: 10 + Math.random() * 12, a: 0.15 + Math.random() * 0.35, t: 0 }
        case 'snow': return { x, y, vx: 0, vy: 0.4 + Math.random() * 1.1, r: 1 + Math.random() * 2.6, a: 0.4 + Math.random() * 0.6, t: Math.random() * 6 }
        case 'stars': return { x, y: Math.random() * h, vx: 0, vy: 0, r: 0.4 + Math.random() * 1.4, a: Math.random(), t: Math.random() * 6 }
        default: return { x, y: Math.random() * h, vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4, r: 1 + Math.random() * 1.8, a: 0.3 + Math.random() * 0.5, t: 0 }
      }
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      w = rect.width
      h = rect.height
      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const density = { rain: 1 / 9000, snow: 1 / 6000, stars: 1 / 2500, particles: 1 / 9000 }[effect] ?? 0
      parts = Array.from({ length: Math.min(400, Math.round(w * h * density)) }, () => spawn(true))
    }

    const draw = () => {
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = color
      ctx.strokeStyle = color
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        if (effect === 'rain') {
          ctx.globalAlpha = p.a
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(p.x, p.y)
          ctx.lineTo(p.x + p.vx * 2, p.y + p.r)
          ctx.stroke()
        } else if (effect === 'stars') {
          ctx.globalAlpha = 0.25 + 0.75 * Math.abs(Math.sin(p.t))
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        } else {
          ctx.globalAlpha = p.a
          ctx.beginPath()
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Particules : relier les points proches.
      if (effect === 'particles') {
        ctx.lineWidth = 0.6
        for (let i = 0; i < parts.length; i++) {
          for (let j = i + 1; j < parts.length; j++) {
            const dx = parts[i].x - parts[j].x
            const dy = parts[i].y - parts[j].y
            const d = dx * dx + dy * dy
            if (d < 9000) {
              ctx.globalAlpha = 0.18 * (1 - d / 9000)
              ctx.beginPath()
              ctx.moveTo(parts[i].x, parts[i].y)
              ctx.lineTo(parts[j].x, parts[j].y)
              ctx.stroke()
            }
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const step = () => {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i]
        p.t += 0.02
        if (effect === 'snow') p.x += Math.sin(p.t) * 0.4
        p.x += p.vx
        p.y += p.vy
        if (effect === 'particles') {
          if (p.x < 0 || p.x > w) p.vx *= -1
          if (p.y < 0 || p.y > h) p.vy *= -1
        } else if (p.y > h + 20 || p.x < -20) parts[i] = spawn(false)
      }
      draw()
      raf = requestAnimationFrame(step)
    }

    resize()
    if (reduce) draw()
    else raf = requestAnimationFrame(step)
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
    }
  }, [effect, color])

  if (effect === 'none' || effect === 'halos') return null
  return <canvas ref={ref} className="pf-effect" aria-hidden="true" />
}
