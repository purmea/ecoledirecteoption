import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle } from '../components/ui'
import { Icon } from '../components/Icon'
import { ProfileView } from '../profile/ProfileCard'
import { LINKS, LinkIcon } from '../profile/links'
import { useDiscord } from '../profile/discord'
import {
  BG_EFFECTS, DEFAULTS, NAME_EFFECTS, PALETTES, WIDGETS,
  type LinkType, type Profile, type Widget, type WidgetType,
} from '../profile/types'
import {
  buildSnapshot, checkHandle, cursorFromImage, deleteProfile, getMyProfile, imageToAvatar,
  saveProfile, suggestHandle, uploadAudio, uploadBackground,
} from '../profile/api'

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
  const [busy, setBusy] = useState<string | null>(null)
  const [handleState, setHandleState] = useState<{ checking: boolean; available?: boolean; reason?: string }>({ checking: false })

  useEffect(() => {
    let alive = true
    getMyProfile(m)
      .then((p) => {
        if (!alive) return
        setSaved(p)
        setDraft(p ?? {
          ...DEFAULTS,
          handle: suggestHandle(data.student.firstName, data.student.lastName),
          displayName: data.student.firstName,
          widgets: [{ id: newId(), type: 'average' }, { id: newId(), type: 'trend' }],
          snapshot,
        })
      })
      .catch((e) => alive && setStatus({ kind: 'error', msg: e.message }))
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m])

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

  const discordCheck = useDiscord(draft?.discordId ?? '', !!draft && (draft.options.discordAvatar || draft.options.discordDecoration || draft.options.discordPresence))

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
  const setIn = <K extends 'colors' | 'effects' | 'glow' | 'options'>(key: K, patch: Partial<Profile[K]>) =>
    set({ [key]: { ...draft[key], ...patch } } as Partial<Profile>)

  /** Exécute un envoi de fichier en affichant l'état « en cours » sur le bon champ. */
  const run = async (field: string, fn: () => Promise<Partial<Profile>>) => {
    setBusy(field)
    try {
      set(await fn())
    } catch (e) {
      setStatus({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    } finally {
      setBusy(null)
    }
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

  const dirty = JSON.stringify({ ...draft, snapshot: null, views: null }) !== JSON.stringify(saved && { ...saved, snapshot: null, views: null })
  const canSave = handleState.available !== false && !handleState.checking && status.kind !== 'saving' && !busy

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

      <div className="pf-preview"><ProfileView profile={{ ...draft, snapshot }} embedded /></div>
      {saved && (
        <div className="pf-share">
          <a href={`#/u/${saved.handle}`} className="link-btn"><Icon name="eye" size={16} />Voir</a>
          <button className="link-btn" onClick={copy}><Icon name="link" size={16} />Copier le lien</button>
        </div>
      )}

      {/* ------------------------------------------------------------ Médias */}
      <SectionTitle>Import de médias</SectionTitle>
      <div className="media-grid">
        <Drop label="Arrière-plan" hint="Image, GIF ou vidéo MP4" accept="image/*,video/mp4,video/webm" busy={busy === 'bg'}
          preview={draft.background && (draft.background.type === 'video'
            ? <video src={draft.background.url} muted autoPlay loop playsInline />
            : <img src={draft.background.url} alt="" />)}
          onFile={(f) => run('bg', async () => ({ background: await uploadBackground(m, f) }))}
          onClear={() => set({ background: null })} />
        <Drop label="Avatar" hint="Recadré en carré" accept="image/*" busy={busy === 'avatar'} round
          preview={draft.avatar && <img src={draft.avatar} alt="" />}
          onFile={(f) => run('avatar', async () => ({ avatar: await imageToAvatar(f) }))}
          onClear={() => set({ avatar: null })} />
        <Drop label="Audio" hint="MP3, M4A, OGG" accept="audio/*" busy={busy === 'audio'}
          preview={draft.audio && <span className="drop-audio"><Icon name="music" size={22} /><small>Musique ajoutée</small></span>}
          onFile={(f) => run('audio', async () => ({ audio: await uploadAudio(m, f) }))}
          onClear={() => set({ audio: null })} />
        <Drop label="Curseur" hint="Petite image (32 px)" accept="image/png,image/webp,image/gif,image/jpeg" busy={busy === 'cursor'}
          preview={draft.cursor && <img src={draft.cursor} alt="" className="drop-cursor" />}
          onFile={(f) => run('cursor', async () => ({ cursor: await cursorFromImage(f) }))}
          onClear={() => set({ cursor: null })} />
      </div>

      {/* ---------------------------------------------------------- Identité */}
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
        <span>Description <em>{draft.bio.length}/140</em></span>
        <textarea value={draft.bio} maxLength={140} rows={2} placeholder="c’est ma description"
          onChange={(e) => set({ bio: e.target.value })} />
      </label>
      <label className="field">
        <span>Localisation</span>
        <span className="prefixed">
          <span><Icon name="pin" size={16} /></span>
          <input value={draft.location} maxLength={40} placeholder="Ma localisation" onChange={(e) => set({ location: e.target.value })} />
        </span>
      </label>

      {/* ----------------------------------------------------------- Réseaux */}
      <SectionTitle meta={`${draft.links.length}/12`}>Réseaux</SectionTitle>
      <ul className="list links-edit">
        {draft.links.map((l, i) => (
          <li key={i}>
            <span className="link-ico"><LinkIcon type={l.type} size={18} /></span>
            <select value={l.type} aria-label="Réseau"
              onChange={(e) => set({ links: draft.links.map((x, j) => (j === i ? { ...x, type: e.target.value as LinkType } : x)) })}>
              {(Object.keys(LINKS) as LinkType[]).map((t) => <option key={t} value={t}>{LINKS[t].label}</option>)}
            </select>
            <input value={l.value} placeholder={LINKS[l.type].placeholder} maxLength={120} autoCapitalize="none" spellCheck={false}
              onChange={(e) => set({ links: draft.links.map((x, j) => (j === i ? { ...x, value: e.target.value.trim() } : x)) })} />
            <button className="icon-btn" onClick={() => set({ links: draft.links.filter((_, j) => j !== i) })} aria-label="Retirer"><Icon name="x" size={16} /></button>
          </li>
        ))}
      </ul>
      {draft.links.length < 12 && (
        <button className="chip" onClick={() => set({ links: [...draft.links, { type: 'instagram', value: '' }] })}>
          <Icon name="plus" size={14} />Ajouter un réseau
        </button>
      )}

      {/* ------------------------------------------- Personnalisation générale */}
      <SectionTitle>Personnalisation générale</SectionTitle>
      <label className="field">
        <span>Effets d’arrière-plan</span>
        <select className="select" value={draft.effects.background} onChange={(e) => setIn('effects', { background: e.target.value as Profile['effects']['background'] })}>
          {BG_EFFECTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </label>
      <label className="field">
        <span>Effets du nom d’utilisateur</span>
        <select className="select" value={draft.effects.username} onChange={(e) => setIn('effects', { username: e.target.value as Profile['effects']['username'] })}>
          {NAME_EFFECTS.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
        </select>
      </label>
      <Range label="Opacité du profil" value={draft.opacity} max={100} unit="%" onChange={(v) => set({ opacity: v })} />
      <Range label="Flou du profil" value={draft.blur} max={80} unit="px" onChange={(v) => set({ blur: v })} />
      <div className="field">
        <span>Effet lumineux</span>
        <div className="glow-grid">
          {([['username', 'Nom d’utilisateur'], ['icons', 'Réseaux'], ['badges', 'Badges'], ['widgets', 'Widgets']] as const).map(([k, label]) => (
            <button key={k} className={`glow-btn ${draft.glow[k] ? 'on' : ''}`} aria-pressed={draft.glow[k]}
              onClick={() => setIn('glow', { [k]: !draft.glow[k] })}>
              <Icon name="star" size={15} />{label}
            </button>
          ))}
        </div>
      </div>

      {/* ----------------------------------------------------------- Couleurs */}
      <SectionTitle>Personnalisation des couleurs</SectionTitle>
      <div className="palettes">
        {PALETTES.map((p) => (
          <button key={p.id} className="palette" onClick={() => set({ colors: p.colors })} title={p.label}>
            <span style={{ background: p.colors.background }}><i style={{ background: p.colors.accent }} /><i style={{ background: p.colors.icons }} /></span>
            {p.label}
          </button>
        ))}
      </div>
      <ColorField label="Couleur d’accentuation (blocs)" value={draft.colors.accent} onChange={(v) => setIn('colors', { accent: v })} />
      <ColorField label="Couleur du texte" value={draft.colors.text} onChange={(v) => setIn('colors', { text: v })} />
      <ColorField label="Couleur d’arrière-plan" value={draft.colors.background} onChange={(v) => setIn('colors', { background: v })} />
      <ColorField label="Couleur des icônes" value={draft.colors.icons} onChange={(v) => setIn('colors', { icons: v })} />

      {/* ------------------------------------------------------------ Widgets */}
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
      <p className="muted small">Les widgets affichent tes moyennes au moment où tu publies, puis se mettent à jour à chaque actualisation.</p>

      {/* ------------------------------------------------------------ Discord */}
      <SectionTitle>Discord</SectionTitle>
      <label className="field">
        <span>Identifiant Discord</span>
        <input value={draft.discordId} inputMode="numeric" placeholder="ex. 123456789012345678" maxLength={21}
          onChange={(e) => set({ discordId: e.target.value.replace(/\D/g, '') })} />
        <small className={discordCheck.error ? 'bad' : discordCheck.info ? 'good' : ''}>
          {discordCheck.error ?? (discordCheck.info ? 'Compte Discord trouvé' : 'Paramètres Discord → Avancés → Mode développeur, puis « Copier l’identifiant ». Il faut aussi rejoindre discord.gg/lanyard.')}
        </small>
      </label>
      <Toggle label="Utiliser l’avatar Discord" on={draft.options.discordAvatar} onChange={(v) => setIn('options', { discordAvatar: v })} />
      <Toggle label="Décoration d’avatar Discord" on={draft.options.discordDecoration} onChange={(v) => setIn('options', { discordDecoration: v })} />
      <Toggle label="Présence Discord" hint="Statut et activité en direct" on={draft.options.discordPresence} onChange={(v) => setIn('options', { discordPresence: v })} />

      {/* ------------------------------------------------------------- Autres */}
      <SectionTitle>Autres personnalisations</SectionTitle>
      <Toggle label="Icônes monochromes" hint="Réseaux dans la couleur des icônes" on={draft.options.monoIcons} onChange={(v) => setIn('options', { monoIcons: v })} />
      <Toggle label="Titre animé" hint="Le titre de l’onglet s’écrit en boucle" on={draft.options.animatedTitle} onChange={(v) => setIn('options', { animatedTitle: v })} />
      <Toggle label="Inverser les couleurs des blocs" hint="Widgets clairs, texte foncé" on={draft.options.invertBlocks} onChange={(v) => setIn('options', { invertBlocks: v })} />
      <Toggle label="Contrôle du volume" hint="Bouton son sur ton profil" on={draft.options.volumeControl} onChange={(v) => setIn('options', { volumeControl: v })} />
      <Toggle label="Badges" hint="Félicitations, compliments, en progression…" on={draft.options.showBadges} onChange={(v) => setIn('options', { showBadges: v })} />

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

// --- Contrôles ----------------------------------------------------------------

function Drop({ label, hint, accept, preview, busy, round, onFile, onClear }: {
  label: string; hint: string; accept: string; preview: ReactNode; busy: boolean; round?: boolean
  onFile: (f: File) => void; onClear: () => void
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="drop-field">
      <span className="drop-label">{label}</span>
      <div className={`drop ${preview ? 'has' : ''} ${round ? 'round' : ''}`}>
        <button className="drop-btn" onClick={() => ref.current?.click()} disabled={busy} aria-label={`${label} : choisir un fichier`}>
          {busy ? <span className="spinner" /> : preview || <><Icon name="image" size={22} /><small>{hint}</small></>}
        </button>
        {preview && !busy && <button className="drop-clear" onClick={onClear} aria-label={`Retirer ${label.toLowerCase()}`}><Icon name="x" size={14} /></button>}
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = '' }} />
    </div>
  )
}

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span className="grow"><span>{label}</span>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" className="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
    </label>
  )
}

function Range({ label, value, max, unit, onChange }: { label: string; value: number; max: number; unit: string; onChange: (v: number) => void }) {
  return (
    <label className="field">
      <span>{label} <em>{value}{unit}</em></span>
      <input type="range" className="range" min={0} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))}
        style={{ '--p': `${(value / max) * 100}%` } as CSSProperties} />
    </label>
  )
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [text, setText] = useState(value)
  useEffect(() => setText(value), [value])
  return (
    <label className="field">
      <span>{label}</span>
      <span className="color-field">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} (sélecteur)`} />
        <input value={text} maxLength={7} spellCheck={false} autoCapitalize="none"
          onChange={(e) => {
            const v = e.target.value.startsWith('#') ? e.target.value : `#${e.target.value}`
            setText(v)
            if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toLowerCase())
          }} />
      </span>
    </label>
  )
}
