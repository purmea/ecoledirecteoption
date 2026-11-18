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
  if (!shown) return null
  return createPortal(
    <div className={`sheet-wrap ${light ? 'light' : ''} ${closing ? 'closing' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet-grab" aria-hidden="true" />
        {open ? children : last.current}
      </section>
    </div>,
    document.body,
  )
}
