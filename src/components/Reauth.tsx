import { useState, type FormEvent } from 'react'
import { LAST_ID_KEY, useSession } from '../state/session'
import { Sheet } from './Sheet'
import { toast } from '../fx'

const lastId = () => { try { return JSON.parse(localStorage.getItem(LAST_ID_KEY) ?? '""') as string } catch { return '' } }

/** Bandeau « session expirée » + panneau de reconnexion : on reste sur la page, les données restent affichées. */
export function Reauth() {
  const { expired, reauth } = useSession()
  const [open, setOpen] = useState(false)
  const [id, setId] = useState(lastId)
  const [pw, setPw] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  if (!expired) return null

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setErr('')
    const problem = await reauth(id.trim(), pw)
    setBusy(false)
    if (problem) return setErr(problem)
    setPw('')
    setOpen(false)
    toast('Reconnecté')
  }

  return (
    <>
      <button className="reauth-banner" onClick={() => setOpen(true)}>
        <span>Session expirée</span><b>Se reconnecter</b>
      </button>
      <Sheet open={open} title="Se reconnecter" onClose={() => setOpen(false)}>
        <h2 className="sheet-title">Se reconnecter</h2>
        <p className="sheet-sub">École Directe a fermé ta session. Tes données restent affichées.</p>
        <form className="sheet-form" onSubmit={submit}>
          <label className="field"><span>Identifiant</span>
            <input value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" spellCheck={false} required />
          </label>
          <label className="field"><span>Mot de passe</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" autoFocus={!!id} required />
          </label>
          {err && <p className="error">{err}</p>}
          <button className="btn primary" disabled={busy}>{busy ? 'Connexion…' : 'Se reconnecter'}</button>
        </form>
      </Sheet>
    </>
  )
}
