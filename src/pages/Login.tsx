import { useEffect, useState, type FormEvent } from 'react'
import { proxyAvailable } from '../api/client'
import { useSession } from '../state/session'

export function Login() {
  const { signIn, startDemo, error, pendingQcm, submitQcm, cancelQcm } = useSession()
  const [identifiant, setIdentifiant] = useState('')
  const [motdepasse, setMotdepasse] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPw, setShowPw] = useState(false)
  const [busy, setBusy] = useState(false)
  const [choice, setChoice] = useState('')
  const [server, setServer] = useState<'checking' | 'ok' | 'missing'>('checking')

  useEffect(() => {
    let alive = true
    proxyAvailable().then((ok) => alive && setServer(ok ? 'ok' : 'missing'))
    return () => { alive = false }
  }, [])
  const offline = server === 'missing'

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    await signIn(identifiant.trim(), motdepasse, remember)
    setBusy(false)
  }

  const onQcm = async (e: FormEvent) => {
    e.preventDefault()
    if (!choice) return
    setBusy(true)
    await submitQcm(choice)
    setBusy(false)
    setChoice('')
  }

  return (
    <main className="login">
      <div className="login-brand">
        <img src="./icon.svg" width="56" height="56" alt="" />
        <h1>EcoleDirecte Option</h1>
        <p className="muted">Tes notes, ton emploi du temps et tes devoirs, au même endroit.</p>
      </div>

      {pendingQcm ? (
        <form className="card login-card" onSubmit={onQcm}>
          <h2>Vérification du compte</h2>
          <p className="muted small">École Directe demande de confirmer ton identité sur ce nouvel appareil.</p>
          <fieldset className="qcm">
            <legend>{pendingQcm.qcm.question}</legend>
            {pendingQcm.qcm.options.map((o) => (
              <label key={o.raw} className={`option ${choice === o.raw ? 'on' : ''}`}>
                <input type="radio" name="qcm" value={o.raw} checked={choice === o.raw} onChange={() => setChoice(o.raw)} />
                {o.label}
              </label>
            ))}
          </fieldset>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary" disabled={busy || !choice}>{busy ? 'Vérification…' : 'Valider'}</button>
          <button type="button" className="btn ghost" onClick={cancelQcm}>Annuler</button>
        </form>
      ) : (
        <form className="card login-card" onSubmit={onSubmit}>
          <h2>Connexion</h2>
          {offline && (
            <p className="notice" role="status">
              La connexion à École Directe n’est pas disponible sur cette version en ligne. Lance l’app avec
              <code>npm run dev</code> (ou <code>npm start</code>), ou essaie la démo.
            </p>
          )}
          <label className="field">
            <span>Identifiant</span>
            <input value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username"
              autoCapitalize="none" autoCorrect="off" spellCheck={false} required disabled={offline} />
          </label>
          <label className="field">
            <span>Mot de passe</span>
            <span className="pw">
              <input type={showPw ? 'text' : 'password'} value={motdepasse} onChange={(e) => setMotdepasse(e.target.value)}
                autoComplete="current-password" required disabled={offline} />
              <button type="button" className="pw-toggle" onClick={() => setShowPw((v) => !v)}
                aria-label={showPw ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPw ? 'Masquer' : 'Afficher'}</button>
            </span>
          </label>
          <label className="checkbox">
            <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
            Rester connecté sur cet appareil
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary" disabled={busy || offline}>{busy ? 'Connexion…' : 'Se connecter'}</button>
          <div className="or"><span>ou</span></div>
          <button type="button" className={`btn ${offline ? 'primary' : 'ghost'}`} onClick={startDemo}>Essayer avec la démo</button>
        </form>
      )}

      <p className="login-note muted small">
        Ton mot de passe n’est jamais enregistré : il est envoyé uniquement à École Directe, via le serveur de l’app.
        Projet non officiel, sans lien avec Aplim.
      </p>
    </main>
  )
}
