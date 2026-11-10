import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/** Panneau qui monte du bas de l'écran (comme sur iOS) ; se ferme en touchant le fond ou avec Échap. */
export function Sheet({ open, title, onClose, children, light }: { open: boolean; title: string; onClose: () => void; children: ReactNode; light?: boolean }) {
  useEffect(() => {
    if (!open) return
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className={`sheet-wrap ${light ? 'light' : ''}`}>
      <div className="sheet-backdrop" onClick={onClose} />
      <section className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <span className="sheet-grab" aria-hidden="true" />
        {children}
      </section>
    </div>,
    document.body,
  )
}
