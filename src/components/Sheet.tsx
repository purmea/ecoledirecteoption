import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Panneau qui monte du bas de l'écran (comme sur iOS) ; se ferme en touchant le fond ou avec Échap. */
export function Sheet({ open, title, onClose, children, light }: { open: boolean; title: string; onClose: () => void; children: ReactNode; light?: boolean }) {
  // Reste affiché le temps de l'animation de fermeture, avec le dernier contenu.
  const [shown, setShown] = useState(open)
  const [closing, setClosing] = useState(false)
  const last = useRef<ReactNode>(children)
  if (open) last.current = children
  useEffect(() => {
    if (open) { setShown(true); setClosing(false); return }
    if (!shown) return
    setClosing(true)
    const t = window.setTimeout(() => { setShown(false); setClosing(false) }, 220)
    return () => window.clearTimeout(t)
  }, [open, shown])
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  // Glisser la poignée : on suit le doigt ; lâcher loin ou vite vers le bas ferme, sinon ça remonte.
  const sheetRef = useRef<HTMLElement>(null)
  const drag = useRef<{ y: number; t: number; lastY: number; lastT: number; v: number } | null>(null)
  const setY = (y: number, anim: boolean) => {
    const el = sheetRef.current
    if (!el) return
    el.style.transition = anim ? 'transform .3s cubic-bezier(.2,.9,.25,1)' : 'none'
    el.style.transform = y ? `translateY(${y}px)` : ''
  }
  const onDown = (e: React.PointerEvent) => {
    drag.current = { y: e.clientY, t: e.timeStamp, lastY: e.clientY, lastT: e.timeStamp, v: 0 }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current
    if (!d) return
    const dy = e.clientY - d.y
    // Vers le haut : petite résistance seulement.
    setY(dy > 0 ? dy : dy / 6, false)
    const dt = e.timeStamp - d.lastT
    if (dt > 0) d.v = 0.6 * ((e.clientY - d.lastY) / dt) + 0.4 * d.v // vitesse lissée (px/ms)
    d.lastY = e.clientY; d.lastT = e.timeStamp
  }
  const onUp = (e: React.PointerEvent) => {
    const d = drag.current
    drag.current = null
    if (!d) return
    const dy = e.clientY - d.y
    // Vitesse au lâcher ; si le doigt s'est arrêté avant de lâcher, elle ne compte plus.
    const v = e.timeStamp - d.lastT > 120 ? 0 : d.v
    const h = sheetRef.current?.offsetHeight ?? 400
    if (dy > h * 0.3 || (v > 0.5 && dy > 10)) {
      setY(h, true)
      window.setTimeout(onClose, 180)
    } else setY(0, true)
  }
  useEffect(() => { if (open) setY(0, false) }, [open])

  if (!shown) return null
  return createPortal(
    <div className={`sheet-wrap ${light ? 'light' : ''} ${closing ? 'closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" ref={sheetRef} role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          <span className="sheet-grab" aria-hidden="true" />
        </div>
        {open ? children : last.current}
      </section>
    </div>,
    document.body,
  )
}
