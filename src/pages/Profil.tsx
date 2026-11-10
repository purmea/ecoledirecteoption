import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle, Segmented } from '../components/ui'
import { ACCENTS, THEMES, useAppearance } from '../state/appearance'
import { Icon } from '../components/Icon'
import { toast } from '../fx'
import { ProfileView } from '../profile/ProfileCard'
import { useDiscord } from '../profile/discord'
import {
  DEFAULTS, WIDGETS,
  type Profile, type Widget, type WidgetType,
} from '../profile/types'
import {
  buildSnapshot, checkHandle, deleteProfile, getMyProfile, imageToAvatar,
  saveProfile, suggestHandle,
} from '../profile/api'

const newId = () => Math.random().toString(36).slice(2, 10)

export function Profil() {
  const data = useData()
  const { mode } = useSession()
  const m = mode ?? 'demo'
  const snapshot = useMemo(() => buildSnapshot(data), [data])
  const { theme, accent, custom, colors: appColors, setTheme, setAccent, setCustom, ui, setUi } = useAppearance()
  // La page de profil reprend les couleurs de l'app : un seul thème pour tout.
  const themed = useMemo(() => ({ background: appColors.bg.startsWith('#') ? appColors.bg : '#0f0f13', text: appColors.text, icons: appColors.accent, accent: appColors.text }), [appColors])
  const fileRef = useRef<HTMLInputElement>(null)
  const subjects = snapshot.subjects.map((s) => s.subject)

  const [saved, setSaved] = useState<Profile | null>(null)
  const [draft, setDraft] = useState<Profile | null>(null)
  const [status, setStatus] = useState<{ kind: 'idle' | 'saving' | 'ok' | 'error'; msg?: string }>({ kind: 'idle' })
  const [busy, setBusy] = useState<string | null>(null)
  // Vrai dès que l'utilisateur modifie quelque chose : rien n'est enregistré (ni pseudo réservé) avant.
  const [touched, setTouched] = useState(false)
  // Changer le thème ou la couleur enregistre aussi les couleurs de la page de profil.
  const firstColors = useRef(true)
  useEffect(() => {
    if (firstColors.current) { firstColors.current = false; return }
    setTouched(true)
  }, [themed.background, themed.text, themed.icons])
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

  // Le message « Profil publié / mis à jour / Lien copié » s'efface tout seul.
  const okMsg = status.kind === 'ok' ? status.msg : null
  useEffect(() => {
    if (!okMsg) return
    const t = setTimeout(() => setStatus({ kind: 'idle' }), 2500)
    return () => clearTimeout(t)
  }, [okMsg])

  // Les fonctions ci-dessous ne sont appelées qu'une fois le profil chargé (voir le retour anticipé plus bas).
  const cur = draft as Profile
  const set = (patch: Partial<Profile>) => {
    setDraft({ ...cur, ...patch })
    setTouched(true)
    setStatus((st) => (st.kind === 'saving' ? st : { kind: 'idle' }))
  }
  const setIn = <K extends 'colors' | 'effects' | 'glow' | 'options'>(key: K, patch: Partial<Profile[K]>) =>
    set({ [key]: { ...cur[key], ...patch } } as Partial<Profile>)

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
    const w = [...cur.widgets]
    const [x] = w.splice(i, 1)
    w.splice(i + d, 0, x)
    setWidgets(w)
  }
  const addWidget = (type: WidgetType) =>
    setWidgets([...cur.widgets, { id: newId(), type, ...(type === 'subject' ? { subject: subjects[0] ?? '' } : {}) }])

  const dirty = JSON.stringify({ ...cur, colors: themed, snapshot: null, views: null }) !== JSON.stringify(saved && { ...saved, snapshot: null, views: null })
  const canSave = handleState.available !== false && !handleState.checking && status.kind !== 'saving' && !busy

  const onSave = async () => {
    const draftAtSave = cur
    setStatus({ kind: 'saving' })
    try {
      const p = await saveProfile(m, { ...cur, colors: themed, snapshot })
      setSaved(p)
      setDraft((d) => (d && JSON.stringify({ ...d, snapshot: null, views: null }) !== JSON.stringify({ ...draftAtSave, snapshot: null, views: null }) ? d : p))
      setStatus({ kind: 'ok', msg: 'Enregistré' })
    } catch (e) {
      setStatus({ kind: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  // Enregistrement automatique : tout changement est enregistré tout seul, sans bouton « valider ».
  useEffect(() => {
    if (!touched || !dirty || !canSave) return
    const t = window.setTimeout(() => { void onSave() }, 650)
    return () => window.clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, touched, dirty, canSave])

  if (!draft) {
    return (
      <>
        <PageHeader title="Profil" />
        {status.kind === 'error' ? <p className="error">{status.msg}</p> : <div className="spinner" />}
      </>
    )
  }

  const publicUrl = `${location.origin}${location.pathname}#/u/${saved?.handle ?? draft.handle}`
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl)
      toast('Lien copié', 'link')
    } catch {
      setStatus({ kind: 'error', msg: publicUrl })
    }
  }

  return (
    <>
      <PageHeader title="Profil" subtitle={m === 'demo' ? 'Mode démo : ton profil reste sur cet appareil.' : undefined} />

      <div className="pf-preview"><ProfileView profile={{ ...draft, colors: themed, snapshot }} embedded /></div>

      <p className={`autosave ${status.kind}`} role="status" aria-live="polite">
        {status.kind === 'saving' ? 'Enregistrement…'
          : status.kind === 'error' ? status.msg
          : status.kind === 'ok' ? 'Enregistré'
          : touched && dirty && handleState.available === false ? 'Choisis un autre pseudo pour enregistrer'
          : saved ? 'Les modifications sont enregistrées automatiquement' : 'Tes modifications seront enregistrées automatiquement'}
      </p>

      <Toggle label="Profil public" hint={draft.public ? 'Tout le monde peut voir ta page avec le lien' : 'Privé : seul toi peux voir ta page'}
        on={draft.public} onChange={(v) => set({ public: v })} />
      {saved && (
        <div className="pf-share">
          <a href={`#/u/${saved.handle}`} className="link-btn"><Icon name="eye" size={16} />Voir</a>
          {saved.public && <button className="link-btn" onClick={copy}><Icon name="link" size={16} />Copier le lien</button>}
        </div>
      )}

      {/* ------------------------------------------------------ Thème et couleurs */}
      <Group title="Thème et couleurs" open>
        <p className="group-hint">S’applique à toute l’application et à ta page de profil.</p>

        <h3 className="sub-title">Fond</h3>
        <div className="theme-tiles" role="radiogroup" aria-label="Fond">
          {THEMES.map((t) => (
            <button key={t.id} role="radio" aria-checked={theme === t.id} className="theme-tile" onClick={() => setTheme(t.id)}>
              <span style={{ background: t.bg }}>
                <i style={{ background: t.fill }} /><i style={{ background: t.fill, width: '40%' }} />
                <b style={{ background: 'var(--accent)' }} />
              </span>
              {t.label}
            </button>
          ))}
          <button role="radio" aria-checked={theme === 'perso'} className="theme-tile" onClick={() => setTheme('perso')}>
            <span style={{ background: custom.bg }}>
              <i style={{ background: 'rgb(255 255 255 / 0.14)' }} /><i style={{ background: 'rgb(255 255 255 / 0.14)', width: '40%' }} />
              <b style={{ background: 'var(--accent)' }} />
            </span>
            Perso
          </button>
        </div>

        <h3 className="sub-title">Couleur</h3>
        <div className="accents" role="radiogroup" aria-label="Couleur d’accent">
          {ACCENTS.map((a) => (
            <button key={a.id} role="radio" aria-checked={accent === a.id} className="accent-dot" onClick={() => setAccent(a.id)}>
              <span style={{ background: appColors.dark ? a.d : a.l }} />
              {a.label}
            </button>
          ))}
          <button role="radio" aria-checked={accent === 'perso'} className="accent-dot" onClick={() => setAccent('perso')}>
            <span style={{ background: custom.accent }} />
            Perso
          </button>
        </div>

        <h3 className="sub-title">Couleur exacte</h3>
        <ColorField label="Couleur d’accent" value={accent === 'perso' ? custom.accent : appColors.accent}
          onChange={(v) => { setCustom({ accent: v }); setAccent('perso') }} />
        <ColorField label="Fond" value={theme === 'perso' ? custom.bg : appColors.bg.startsWith('#') ? appColors.bg : '#0f0f13'}
          onChange={(v) => { setCustom({ bg: v }); setTheme('perso') }} />
      </Group>

      {/* ---------------------------------------------------------- Identité */}
      <Group title="Identité" open>
      <div className="row-form">
        <button className="avatar-edit" onClick={() => fileRef.current?.click()} aria-label="Changer la photo de profil" disabled={busy === 'avatar'}>
          {busy === 'avatar' ? <span className="spinner" /> : draft.avatar ? <img src={draft.avatar} alt="" /> : <Icon name="camera" size={20} />}
        </button>
        <div className="grow">
          <button className="text-btn" onClick={() => fileRef.current?.click()}>{draft.avatar ? 'Changer la photo' : 'Ajouter une photo'}</button>
          {draft.avatar && <button className="text-btn muted" onClick={() => set({ avatar: null })}>Retirer</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void run('avatar', async () => ({ avatar: await imageToAvatar(f) })); e.target.value = '' }} />
      </div>
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
      </Group>
      {/* ------------------------------------------- Personnalisation générale */}
      <Group title="Personnalisation générale">
      <p className="group-hint">Réglages de l’interface, pour toute l’application.</p>
      <Toggle label="Animations" hint="Transitions, ressorts et effets d’entrée" on={ui.animations} onChange={(v) => setUi({ animations: v })} />
      <div className="field">
        <span>Taille du texte</span>
        <Segmented label="Taille du texte" value={ui.textSize} onChange={(v) => setUi({ textSize: v })}
          options={[['small', 'Petit'], ['normal', 'Normal'], ['large', 'Grand']] as const} />
      </div>
      <Toggle label="Vibrations" hint="Léger retour au toucher (selon le téléphone)" on={ui.vibration} onChange={(v) => setUi({ vibration: v })} />
      <Toggle label="Confettis" hint="Quand tous les devoirs sont faits" on={ui.confetti} onChange={(v) => setUi({ confetti: v })} />
      <Toggle label="Noms sous les icônes" hint="Libellés de la barre du bas" on={ui.navLabels} onChange={(v) => setUi({ navLabels: v })} />
      </Group>
      {/* ------------------------------------------------------------ Widgets */}
      <Group title="Widgets" meta={`${draft.widgets.length}/8`}>
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

      </Group>
      {/* ------------------------------------------------------------ Discord */}
      <Group title="Discord">
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

      </Group>
      {/* ------------------------------------------------------------- Autres */}
      <Group title="Autres personnalisations">
      <Toggle label="Animations de la page" hint="Entrée en douceur et particules sur ta page de profil" on={draft.options.animations} onChange={(v) => setIn('options', { animations: v })} />
      <Toggle label="Compteur de vues" hint="Affiche combien de fois ta page a été vue" on={draft.options.showViews} onChange={(v) => setIn('options', { showViews: v })} />
      <Toggle label="Ancienneté" hint="Affiche « depuis 3 mois » en bas de ta page" on={draft.options.showSince} onChange={(v) => setIn('options', { showSince: v })} />
      <Toggle label="Inverser les couleurs des blocs" hint="Widgets clairs, texte foncé" on={draft.options.invertBlocks} onChange={(v) => setIn('options', { invertBlocks: v })} />

      </Group>

      <SectionTitle>Application</SectionTitle>
      <a href="#/reglages" className="row-link"><span className="grow">Réglages</span><Icon name="chevron" size={16} /></a>
      {saved && (
        <button className="row-link danger" onClick={async () => {
          if (!confirm('Supprimer ton profil public ? Ton pseudo sera libéré.')) return
          await deleteProfile(m)
          setSaved(null)
          setTouched(false) // sinon l'enregistrement automatique le recréerait aussitôt
          setStatus({ kind: 'ok', msg: 'Profil supprimé' })
        }}><span className="grow">Supprimer mon profil public</span></button>
      )}
    </>
  )
}

// --- Contrôles ----------------------------------------------------------------

function Toggle({ label, hint, on, onChange }: { label: string; hint?: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="toggle-row">
      <span className="grow"><span>{label}</span>{hint && <small>{hint}</small>}</span>
      <input type="checkbox" role="switch" className="switch" checked={on} onChange={(e) => onChange(e.target.checked)} />
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

/** Section repliable de l'éditeur. */
function Group({ title, meta, open, children }: { title: string; meta?: ReactNode; open?: boolean; children: ReactNode }) {
  return (
    <details className="group" open={open}>
      <summary>
        <span>{title}</span>
        {meta && <em>{meta}</em>}
        <Icon name="chevron" size={16} />
      </summary>
      <div className="group-body">{children}</div>
    </details>
  )
}
