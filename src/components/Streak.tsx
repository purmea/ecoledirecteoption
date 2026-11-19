/**
 * Série de notes qui font monter la moyenne : le logo flamme dans un rond stylisé, avec le nombre.
 * Le logo est l'emoji 🔥 du système (celui d'Apple sur iPhone) : un vrai logo en couleurs, pas un dessin maison.
 */
export function Streak({ count }: { count: number }) {
  return (
    <div className={`streak ${count === 0 ? 'zero' : ''}`} role="img"
      aria-label={count === 0 ? 'Série à zéro : la dernière note a fait baisser ta moyenne' : `Série : ${count} note${count > 1 ? 's' : ''} d’affilée qui font monter ta moyenne`}>
      <span className="streak-ring" aria-hidden="true"><span className="streak-flame">🔥</span></span>
      <strong key={count}>{count}</strong>
    </div>
  )
}
