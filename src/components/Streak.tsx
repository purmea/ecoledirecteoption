/**
 * Série de notes qui font monter la moyenne : contour de flamme orange dans un cercle rouge, avec le nombre.
 * Le tracé de la flamme est l'icône « flame » de Lucide (https://lucide.dev, licence ISC).
 */
export function Streak({ count }: { count: number }) {
  return (
    <div className={`streak ${count === 0 ? 'zero' : ''}`} role="img"
      aria-label={count === 0 ? 'Série à zéro : la dernière note a fait baisser ta moyenne' : `Série : ${count} note${count > 1 ? 's' : ''} d’affilée qui font monter ta moyenne`}>
      <span className="streak-ring" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#ff9a1f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" />
        </svg>
      </span>
      <strong>{count}</strong>
    </div>
  )
}
