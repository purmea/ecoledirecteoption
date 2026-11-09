import type { CSSProperties } from 'react'
import { fmt } from '../lib'
import { Icon } from '../components/Icon'
import { THEMES, type Profile, type Widget } from './types'

/** Fond plein écran animé (halos flous aux couleurs du thème). */
export function ProfileBackdrop({ theme }: { theme: Profile['theme'] }) {
  const t = THEMES.find((x) => x.id === theme) ?? THEMES[0]
  const style = { '--c1': t.colors[0], '--c2': t.colors[1], '--c3': t.colors[2] } as CSSProperties
  return (
    <div className="pf-backdrop" style={style} aria-hidden="true">
      <span /><span /><span />
    </div>
  )
}

export function ProfileCard({ profile, preview = false }: { profile: Profile; preview?: boolean }) {
  const t = THEMES.find((x) => x.id === profile.theme) ?? THEMES[0]
  const style = { '--glow': t.colors[1], '--glow-2': t.colors[2] } as CSSProperties
  const initials = (profile.displayName || profile.handle).slice(0, 2).toUpperCase()

  return (
    <article className={`pf-card ${preview ? 'is-preview' : ''}`} style={style}>
      {profile.views !== undefined && !preview && (
        <span className="pf-views" title="Vues du profil"><Icon name="eye" size={14} />{profile.views.toLocaleString('fr-FR')}</span>
      )}
      <div className="pf-avatar">
        {profile.avatar ? <img src={profile.avatar} alt="" /> : <span>{initials}</span>}
      </div>
      <h1 className="pf-name">{profile.displayName || profile.handle}</h1>
      <p className="pf-handle">@{profile.handle}</p>
      {profile.bio && <p className="pf-bio">{profile.bio}</p>}

      {profile.widgets.length > 0 && (
        <div className="pf-widgets">
          {profile.widgets.map((w, i) => <WidgetTile key={w.id} widget={w} profile={profile} wide={isWide(profile.widgets, i)} />)}
        </div>
      )}
      {profile.snapshot.period && profile.widgets.length > 0 && (
        <p className="pf-foot">{profile.snapshot.period}{profile.snapshot.updatedAt ? ` · mis à jour le ${new Date(profile.snapshot.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</p>
      )}
    </article>
  )
}

const SMALL = new Set(['average', 'subject', 'homework'])

/** Les petites tuiles vont par deux ; une petite tuile sans voisine prend toute la largeur. */
function isWide(widgets: Widget[], i: number) {
  if (!SMALL.has(widgets[i].type)) return true
  let run = 0 // position de la tuile dans sa suite de petites tuiles
  for (let j = i - 1; j >= 0 && SMALL.has(widgets[j].type); j--) run++
  const pairedWithNext = run % 2 === 0 && i + 1 < widgets.length && SMALL.has(widgets[i + 1].type)
  return run % 2 === 0 && !pairedWithNext
}

function WidgetTile({ widget, profile, wide }: { widget: Widget; profile: Profile; wide: boolean }) {
  const s = profile.snapshot
  const cls = `pf-tile${wide ? ' wide' : ''}`
  switch (widget.type) {
    case 'average':
      return (
        <div className={cls}>
          <span className="pf-label">Moyenne générale</span>
          <strong className="pf-big">{s.average !== null ? fmt(s.average) : '—'}<small>/20</small></strong>
        </div>
      )
    case 'subject': {
      const x = s.subjects.find((y) => y.subject === widget.subject)
      return (
        <div className={cls}>
          <span className="pf-label">{widget.subject || 'Matière'}</span>
          <strong className="pf-big">{x ? fmt(x.average) : '—'}<small>/20</small></strong>
        </div>
      )
    }
    case 'homework':
      return (
        <div className={cls}>
          <span className="pf-label">Devoirs restants</span>
          <strong className="pf-big">{s.homeworkLeft ?? '—'}</strong>
        </div>
      )
    case 'trend':
      return (
        <div className={cls}>
          <span className="pf-label">Évolution de la moyenne</span>
          <TrendLine values={s.trend} />
        </div>
      )
    case 'subjects': {
      const top = [...s.subjects].sort((a, b) => b.average - a.average).slice(0, 3)
      return (
        <div className={cls}>
          <span className="pf-label">Meilleures matières</span>
          <ul className="pf-bars">
            {top.map((x) => (
              <li key={x.subject}>
                <span className="pf-bar-name">{x.subject}</span>
                <span className="pf-bar"><span style={{ width: `${(x.average / 20) * 100}%` }} /></span>
                <span className="pf-bar-val">{fmt(x.average)}</span>
              </li>
            ))}
            {top.length === 0 && <li className="pf-label">Pas encore de notes</li>}
          </ul>
        </div>
      )
    }
  }
}

function TrendLine({ values }: { values: number[] }) {
  if (values.length < 2) return <p className="pf-label">Pas encore assez de notes</p>
  const w = 300
  const h = 64
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const span = hi - lo || 1
  const pts = values.map((v, i) => [(i / (values.length - 1)) * (w - 8) + 4, h - 6 - ((v - lo) / span) * (h - 12)] as const)
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('')
  const [lx, ly] = pts[pts.length - 1]
  return (
    <div className="pf-trend">
      <div className="pf-trend-plot">
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
          <path d={`${d}L${lx},${h}L4,${h}Z`} className="area" />
          <path d={d} className="line" />
        </svg>
        <span className="pf-dot" style={{ left: `${(lx / w) * 100}%`, top: `${(ly / h) * 100}%` }} />
      </div>
      <span className="pf-trend-val">{fmt(values[values.length - 1])}</span>
    </div>
  )
}
