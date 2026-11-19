/** Série de notes qui font monter la moyenne : flamme orange dans un cercle rouge, avec le nombre. */
export function Streak({ count }: { count: number }) {
  return (
    <div className={`streak ${count === 0 ? 'zero' : ''}`} role="img"
      aria-label={count === 0 ? 'Série à zéro : la dernière note a fait baisser ta moyenne' : `Série : ${count} note${count > 1 ? 's' : ''} d’affilée qui font monter ta moyenne`}>
      <span className="streak-ring" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="30" height="30">
          <defs>
            <linearGradient id="flame" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#ff6a00" /><stop offset="1" stopColor="#ffb21f" /></linearGradient>
          </defs>
          <path d="M12.5 1.8c.7 3.5-1.5 5-3.1 7C7.7 10.9 6.2 12.7 6.2 15.5a5.8 5.8 0 0 0 11.6 0c0-2.4-1.1-4.1-2.4-5.6-.3 1.2-.9 2-1.9 2.4.7-4.1-.6-8-1-10.5z" fill="url(#flame)" />
          <path d="M12 21.1a3 3 0 0 1-3-3c0-1.5.9-2.4 1.7-3.4.5-.6.9-1.3 1-2.1 1.4 1 2.3 2.4 2.3 4.2a3 3 0 0 1-2 4.3z" fill="#ffe08a" />
        </svg>
      </span>
      <strong key={count}>{count}</strong>
    </div>
  )
}
