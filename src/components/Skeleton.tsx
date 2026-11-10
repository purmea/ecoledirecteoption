/** Écran de chargement : la forme de l'accueil en gris, qui scintille. */
export function Skeleton() {
  return (
    <div className="app" aria-busy="true" aria-label="Chargement de tes données">
      <main className="page skel">
        <div className="sk sk-line" style={{ width: '36%' }} />
        <div className="sk sk-title" style={{ width: '62%' }} />
        <div className="sk sk-line" style={{ width: '30%', marginTop: 28 }} />
        <div className="sk sk-big" />
        <div className="sk sk-card" />
        {[0, 1, 2].map((i) => (
          <div key={i} className="sk-row">
            <div className="sk sk-time" />
            <div className="grow"><div className="sk sk-line" style={{ width: '55%' }} /><div className="sk sk-line" style={{ width: '38%', marginTop: 8 }} /></div>
          </div>
        ))}
      </main>
    </div>
  )
}
