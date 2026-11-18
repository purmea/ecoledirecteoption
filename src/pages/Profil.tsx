import { useEffect, useState, type ReactNode } from 'react'
import { useData, useSession } from '../state/session'
import { PageHeader, SectionTitle, Segmented } from '../components/ui'
import { ACCENTS, THEMES, useAppearance } from '../state/appearance'
import { Icon } from '../components/Icon'
import { timeAgo } from '../lib'

/** Onglet Réglages : fond, couleurs, options de l'interface et compte. */
export function Profil() {
  const { student } = useData()
  const { mode, refresh, refreshing, signOut, updatedAt } = useSession()
  const { theme, accent, custom, colors: appColors, setTheme, setAccent, setCustom, ui, setUi } = useAppearance()

  return (
    <>
      <PageHeader title="Réglages" subtitle={[`${student.firstName} ${student.lastName}`, student.className].filter(Boolean).join(' · ')} />

      {/* ------------------------------------------------------ Thème et couleurs */}
      <Group title="Thème et couleurs" open>
        <p className="group-hint">S’applique à toute l’application.</p>

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
          <button role="radio" aria-checked={theme === 'perso'} className="theme-plus" onClick={() => setTheme('perso')} aria-label="Fond personnalisé">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
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

      <SectionTitle>Compte</SectionTitle>
      <div className="list actions">
        <button className="row-action" onClick={() => void refresh()} disabled={refreshing}>
          {refreshing ? 'Actualisation…' : mode === 'demo' ? 'Réinitialiser la démo' : 'Actualiser les données'}
          {mode === 'live' && updatedAt && !refreshing && <small>Mis à jour {timeAgo(updatedAt)}</small>}
        </button>
        <button className="row-action danger" onClick={signOut}>
          {mode === 'demo' ? 'Quitter la démo' : 'Se déconnecter'}
        </button>
      </div>

      <p className="footer muted small">
        EcoleDirecte Option v{__APP_VERSION__} · projet non officiel, sans lien avec Aplim.
      </p>
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
