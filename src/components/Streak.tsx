/** Série de notes qui font monter la moyenne : petite flamme orange (contour) dans un rond rouge. */
export function Streak({ count }: { count: number }) {
  return (
    <span className={`streak ${count === 0 ? 'off' : ''}`} role="img"
      aria-label={count === 0 ? 'Pas de série en cours' : `Série : ${count} note${count > 1 ? 's' : ''} d’affilée qui font monter ta moyenne`}>
      <svg viewBox="0 0 24 24" width="22" height="22" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10.5" stroke="#ff3b30" strokeWidth="1.6" />
        <path d="M12 5.5c.4 2.2 3.9 3.9 3.9 7.4a3.9 3.9 0 0 1-7.8 0c0-1.6.8-2.6 1.6-3.3.1 1.1.6 1.9 1.4 2.2-.4-2.3.3-4.6.9-6.3z" stroke="#ff9500" strokeWidth="1.6" />
      </svg>
      <b>{count}</b>
    </span>
  )
}
