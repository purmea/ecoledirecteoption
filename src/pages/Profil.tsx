import { useEffect, useMemo, useRef, useState } from 'react'
import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle } from '../components/ui'
import { Icon } from '../components/Icon'
import { ProfileBackdrop, ProfileCard } from '../profile/ProfileCard'
import { THEMES, WIDGETS, type Profile, type Widget, type WidgetType } from '../profile/types'
import { buildSnapshot, checkHandle, deleteProfile, getMyProfile, imageToAvatar, saveProfile, suggestHandle } from '../profile/api'

const newId = () => Math.random().toString(36).slice(2, 10)

export function Profil() {
  const data = useData()
  const { mode } = useSession()
  const m = mode ?? 'demo'
  const snapshot = useMemo(() => buildSnapshot(data), [data])
  const subjects = snapshot.subjects.map((s) => s.subject)

  const [saved, setSaved] = useState<Profile | null>(null)
  const [draft, setDraft] = useState<Profile | null>(null)
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' })
  const [handleState, setHandleState] = useState<{ checking: boolean; available?: boolean; reason?: string }>({ checking: false })
  const fileRef = useRef<HTMLInputElement>(null)

  // Chargement du profil existant, sinon brouillon pré-rempli.
  useEffect(() => {
    let alive = true
    getMyProfile(m)
      .then((p) => {
        if (!alive) return
        setSaved(p)
        setDraft(p ?? {
          handle: suggestHandle(data.student.firstName, data.student.lastName),
          displayName: data.student.firstName,
          bio: '',
          avatar: null,
          theme: 'aurora',
          widgets: [{ id: newId(), type: 'average' }, { id: newId(), type: 'trend' }],
          snapshot,
        })
      })
      .catch((e) => alive && setStatus({ kind: 'error', msg: e.message }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m])

  // Vérification du pseudo en direct (avec un léger délai).
  const handle = draft?.handle ?? ''
  useEffect(() => {
    if (!handle) return
    if (saved?.handle === handle) return setHandleState({ checking: false, available: true })
    setHandleState({ checking: true })
    const t = setTimeout(() => {
      checkHandle(m, handle)
        .then((r) => setHandleState({ checking: false, ...r }))
        .catch((e) => setHandleState({ checking: false, available: false, reason: e.message }))
    }, 350)
    return () => clearTimeout(t)
  }, [handle, m, saved?.handle])

  if (!draft) {
    return (
      <>
        <PageHeader title="Profil" />
        {status.kind === 'error' ? <p className="error">{status.msg}</p> : <div className="spinner" />}
      </>
    )
  }

  const set = (patch: Partial<Profile>) => {
    setDraft({ ...draft, ...patch })
    setStatus({ kind: 'idle' })
  }
  const setWidgets = (widgets: Widget[]) => set({ widgets })
  const move = (i: number, d: number) => {
    const w = [...draft.widgets]
    const [x] = w.splice(i, 1)
    w.splice(i + d, 0, x)
    setWidgets(w)
  }
  const addWidget = (type: WidgetType) =>
    setWidgets([...draft.widgets, { id: newId(), type, ...(type === 'subject' ? { subject: subjects[0] ?? '' } : {}) }])

  const onPhoto = async (f?: File) => {
    if (!f) return
    try {
      set({ avatar: await imageToAvatar(f) })
    } catch (e) {
      setStatus({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  const dirty = JSON.stringify({ ...draft, snapshot: null, views: null }) !== JSON.stringify(saved && { ...saved, snapshot: null, views: null })
  const canSave = handleState.available !== false && !handleState.checking && status.kind !== 'saving'

  const onSave = async () => {
    setStatus({ kind: 'saving' })
    try {
      const p = await saveProfile(m, { ...draft, snapshot })
      setSaved(p)
      setDraft(p)
      setStatus({ kind: 'ok', msg: saved ? 'Profil mis à jour' : 'Profil publié' })
    } catch (e) {
      setStatus({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  const publicUrl = `${location.origin}${location.pathname}#/u/${saved?.handle ?? draft.handle}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      setStatus({ kind: 'ok', msg: 'Lien copié' })
    } catch {
      setStatus({ kind: 'error', msg: publicUrl })
    }
  }

  return (
    <>
      <PageHeader title="Profil" subtitle={m === 'demo' ? 'Mode démo : ton profil reste sur cet appareil.' : undefined} />

      <div className="pf-preview">
        <ProfileBackdrop theme={draft.theme} />
        <ProfileCard profile={{ ...draft, snapshot }} preview />
      </div>

      {saved && (
        <div className="pf-share">
          <a href={`#/u/${saved.handle}`} className="link-btn"><Icon name="eye" size={16} />Voir</a>
          <button className="link-btn" onClick={copy}><Icon name="link" size={16} />Copier le lien</button>
        </div>
      )}

      <SectionTitle>Photo</SectionTitle>
      <div className="row-form">
        <button className="avatar-edit" onClick={() => fileRef.current?.click()} aria-label="Changer la photo de profil">
          {draft.avatar ? <img src={draft.avatar} alt="" /> : <Icon name="camera" size={20} />}
        </button>
        <div className="grow">
          <button className="text-btn" onClick={() => fileRef.current?.click()}>{draft.avatar ? 'Changer la photo' : 'Ajouter une photo'}</button>
          {draft.avatar && <button className="text-btn muted" onClick={() => set({ avatar: null })}>Retirer</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { void onPhoto(e.target.files?.[0]); e.target.value = '' }} />
      </div>

      <SectionTitle>Identité</SectionTitle>
      <label className="field">
        <span>Pseudo</span>
        <span className="prefixed">
          <span>@</span>
          <input value={draft.handle} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false}
            onChange={(e) => set({ handle: e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, '') })} />
        </span>
        <small className={handleState.available === false ? 'bad' : handleState.available ? 'good' : ''}>
          {handleState.checking ? 'Vérification…'
            : handleState.available === false ? handleState.reason
            : handleState.available ? (saved?.handle === draft.handle ? 'C’est ton pseudo' : 'Disponible') : ' '}
        </small>
      </label>
      <label className="field">
        <span>Nom affiché</span>
        <input value={draft.displayName} maxLength={32} onChange={(e) => set({ displayName: e.target.value })} />
      </label>
      <label className="field">
        <span>Bio <em>{draft.bio.length}/140</em></span>
        <textarea value={draft.bio} maxLength={140} rows={2} placeholder="Une phrase sur toi"
          onChange={(e) => set({ bio: e.target.value })} />
      </label>

      <SectionTitle>Thème</SectionTitle>
      <div className="swatches" role="radiogroup" aria-label="Thème du profil">
        {THEMES.map((t) => (
          <button key={t.id} role="radio" aria-checked={draft.theme === t.id} className="swatch"
            onClick={() => set({ theme: t.id })}>
            <span style={{ background: `linear-gradient(135deg, ${t.colors.join(', ')})` }} />
            {t.label}
          </button>
        ))}
      </div>

      <SectionTitle meta={`${draft.widgets.length}/8`}>Widgets</SectionTitle>
      <ul className="list widget-list">
        {draft.widgets.map((w, i) => (
          <li key={w.id}>
            <div className="grow">
              <strong>{WIDGETS.find((x) => x.type === w.type)?.label}</strong>
              {w.type === 'subject' ? (
                <select value={w.subject} onChange={(e) => setWidgets(draft.widgets.map((x) => (x.id === w.id ? { ...x, subject: e.target.value } : x)))}>
                  {subjects.map((s) => <option key={s}>{s}</option>)}
                </select>
              ) : <small>{WIDGETS.find((x) => x.type === w.type)?.hint}</small>}
            </div>
            <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Monter"><Icon name="up" size={16} /></button>
            <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === draft.widgets.length - 1} aria-label="Descendre"><Icon name="down" size={16} /></button>
            <button className="icon-btn" onClick={() => setWidgets(draft.widgets.filter((x) => x.id !== w.id))} aria-label="Retirer"><Icon name="x" size={16} /></button>
          </li>
        ))}
      </ul>
      {draft.widgets.length < 8 && (
        <div className="chips">
          {WIDGETS.filter((x) => x.type === 'subject' || !draft.widgets.some((w) => w.type === x.type)).map((x) => (
            <button key={x.type} className="chip" onClick={() => addWidget(x.type)} disabled={x.type === 'subject' && !subjects.length}>
              <Icon name="plus" size={14} />{x.label}
            </button>
          ))}
        </div>
      )}
      <p className="muted small">Les widgets affichent tes moyennes au moment où tu publies. Elles sont mises à jour à chaque publication.</p>

      <div className="save-bar">
        {status.kind === 'error' && <p className="error" role="alert">{status.msg}</p>}
        {status.kind === 'ok' && <p className="ok" role="status">{status.msg}</p>}
        <button className="btn primary" onClick={onSave} disabled={!canSave || (!dirty && !!saved && status.kind !== 'error')}>
          {status.kind === 'saving' ? 'Enregistrement…' : saved ? (dirty ? 'Enregistrer' : 'Enregistré') : 'Publier mon profil'}
        </button>
        {saved && (
          <button className="btn ghost danger" onClick={async () => {
            if (!confirm('Supprimer ton profil public ? Ton pseudo sera libéré.')) return
            await deleteProfile(m)
            setSaved(null)
            setStatus({ kind: 'ok', msg: 'Profil supprimé' })
          }}>Supprimer le profil</button>
        )}
      </div>

      <SectionTitle>Application</SectionTitle>
      <a href="#/reglages" className="row-link"><span className="grow">Réglages</span><Icon name="chevron" size={16} /></a>
    </>
  )
}
