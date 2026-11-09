import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { fmt } from '../lib'
import { Icon } from '../components/Icon'
import { badgesFor } from './api'
import { useDiscord } from './discord'
import { EffectCanvas } from './effects'
import { LINKS, LinkIcon, brandColor } from './links'
import type { NameEffect, Profile, Widget } from './types'

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/** Page de profil complète (façon guns.lol). `embedded` = aperçu dans l'éditeur. */
export function ProfileView({ profile, embedded = false }: { profile: Profile; embedded?: boolean }) {
  const { colors, options, effects, glow } = profile
  const wantsDiscord = options.discordAvatar || options.discordDecoration || options.discordPresence
  const { info: discord } = useDiscord(profile.discordId, wantsDiscord)
  const hasAudio = !!profile.audio && !embedded
  const [entered, setEntered] = useState(!hasAudio)

  useAnimatedTitle(`@${profile.handle}`, embedded ? 'off' : options.animatedTitle ? 'animated' : 'static')

  const tileAlpha = Math.min(100, profile.opacity + 15)
  const style = {
    '--pf-text': colors.text,
    '--pf-text-rgb': rgb(colors.text),
    '--pf-bg': colors.background,
    '--pf-icons': colors.icons,
    '--pf-icons-rgb': rgb(colors.icons),
    '--pf-block': `rgb(${rgb(colors.accent)} / ${profile.opacity / 100})`,
    '--pf-tile': options.invertBlocks ? `rgb(${rgb(colors.text)} / 0.92)` : `rgb(${rgb(colors.accent)} / ${tileAlpha / 100})`,
    '--pf-tile-text': options.invertBlocks ? colors.background : colors.text,
    '--pf-tile-text-rgb': rgb(options.invertBlocks ? colors.background : colors.text),
    '--pf-blur': `${profile.blur}px`,
    cursor: profile.cursor ? `url(${profile.cursor}) 0 0, auto` : undefined,
  } as CSSProperties

  const avatar = (options.discordAvatar && discord?.avatarUrl) || profile.avatar
  const badges = options.showBadges ? badgesFor(profile.snapshot) : []

  return (
    <div className={`pf-page ${embedded ? 'embedded' : ''}`} style={style}>
      <div className="pf-backdrop" aria-hidden="true">
        {profile.background?.type === 'video' && <video src={profile.background.url} autoPlay muted loop playsInline />}
        {profile.background?.type === 'image' && <img src={profile.background.url} alt="" />}
        {effects.background === 'halos' && <div className="pf-halos"><span /><span /><span /></div>}
        <EffectCanvas effect={effects.background} color={colors.text} />
      </div>

      {!entered && (
        <button className="pf-enter" onClick={() => setEntered(true)}>
          <span>clique pour entrer</span>
        </button>
      )}

      <article className={`pf-card ${entered ? 'in' : 'hidden'}`}>
        {profile.views !== undefined && !embedded && (
          <span className="pf-views" title="Vues du profil"><Icon name="eye" size={14} />{profile.views.toLocaleString('fr-FR')}</span>
        )}

        <div className="pf-avatar-wrap">
          <div className="pf-avatar">
            {avatar ? <img src={avatar} alt="" /> : <span>{(profile.displayName || profile.handle).slice(0, 2).toUpperCase()}</span>}
          </div>
          {options.discordDecoration && discord?.decorationUrl && <img className="pf-deco" src={discord.decorationUrl} alt="" />}
          {options.discordPresence && discord && <span className={`pf-status ${discord.status}`} title={discord.status} />}
        </div>

        <h1 className={`pf-name ${glow.username ? 'glow' : ''}`}>
          <NameFx text={profile.displayName || profile.handle} effect={effects.username} />
        </h1>
        <p className="pf-handle">@{profile.handle}</p>

        {badges.length > 0 && (
          <ul className={`pf-badges ${glow.badges ? 'glow' : ''}`}>
            {badges.map((b) => <li key={b.id} title={b.label}><Icon name={b.icon} size={14} />{b.label}</li>)}
          </ul>
        )}

        {profile.bio && <p className="pf-bio">{profile.bio}</p>}
        {profile.location && <p className="pf-location"><Icon name="pin" size={14} />{profile.location}</p>}

        {profile.links.length > 0 && (
          <ul className={`pf-links ${glow.icons ? 'glow' : ''}`}>
            {profile.links.map((l, i) => {
              const def = LINKS[l.type]
              const href = def.url(l.value)
              const color = options.monoIcons ? 'var(--pf-icons)' : brandColor(def.icon)
              return (
                <li key={i} style={{ color }}>
                  {href
                    ? <a href={href} target="_blank" rel="noopener noreferrer nofollow" title={`${def.label} : ${l.value}`}><LinkIcon type={l.type} /></a>
                    : <button title={`${def.label} : ${l.value} (copier)`} onClick={() => void navigator.clipboard?.writeText(l.value)}><LinkIcon type={l.type} /></button>}
                </li>
              )
            })}
          </ul>
        )}

        {(profile.widgets.length > 0 || (options.discordPresence && discord?.activity)) && (
          <div className={`pf-widgets ${glow.widgets ? 'glow' : ''}`}>
            {options.discordPresence && discord?.activity && (
              <div className="pf-tile wide pf-presence">
                <span className="pf-label">Discord</span>
                <strong>{discord.activity}</strong>
              </div>
            )}
            {profile.widgets.map((w, i) => <WidgetTile key={w.id} widget={w} profile={profile} wide={isWide(profile.widgets, i)} />)}
          </div>
        )}
        {profile.snapshot.period && profile.widgets.length > 0 && (
          <p className="pf-foot">{profile.snapshot.period}{profile.snapshot.updatedAt ? ` · mis à jour le ${new Date(profile.snapshot.updatedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}` : ''}</p>
        )}
      </article>

      {hasAudio && entered && <AudioPlayer src={profile.audio!} showControl={options.volumeControl} />}
      {!embedded && <a href="#/" className="pf-brand">EcoleDirecte Option</a>}
    </div>
  )
}

// --- Effets du pseudo -------------------------------------------------------

function NameFx({ text, effect }: { text: string; effect: NameEffect }) {
  const typed = useTypewriter(text, effect === 'typewriter')
  switch (effect) {
    case 'rainbow': return <span className="fx-rainbow">{text}</span>
    case 'glitch': return <span className="fx-glitch" data-text={text}>{text}</span>
    case 'typewriter': return <span className="fx-type" aria-label={text}>{typed}<i aria-hidden="true">|</i></span>
    case 'sparkles':
      return (
        <span className="fx-sparkles">
          {text}
          {[0, 1, 2, 3].map((i) => <i key={i} aria-hidden="true">✦</i>)}
        </span>
      )
    default: return <>{text}</>
  }
}

function useTypewriter(text: string, on: boolean) {
  const [n, setN] = useState(text.length)
  useEffect(() => {
    if (!on || matchMedia('(prefers-reduced-motion: reduce)').matches) return setN(text.length)
    let i = 0
    let dir = 1
    let pause = 0
    const t = setInterval(() => {
      if (pause > 0) return void pause--
      i += dir
      if (i >= text.length) { dir = -1; pause = 16 }
      if (i <= 0) { dir = 1; pause = 4 }
      setN(i)
    }, 110)
    return () => clearInterval(t)
  }, [text, on])
  return text.slice(0, n)
}

/** Titre de l'onglet qui s'écrit puis s'efface en boucle. */
function useAnimatedTitle(title: string, mode: 'off' | 'static' | 'animated') {
  useEffect(() => {
    if (mode === 'off') return
    const prev = document.title
    if (mode === 'static') {
      document.title = `${title} · EcoleDirecte Option`
      return () => { document.title = prev }
    }
    let i = 0
    let dir = 1
    const t = setInterval(() => {
      i += dir
      if (i >= title.length + 6) dir = -1
      if (i <= 1) dir = 1
      document.title = title.slice(0, Math.max(1, Math.min(title.length, i)))
    }, 300)
    return () => { clearInterval(t); document.title = prev }
  }, [title, mode])
}

// --- Musique ----------------------------------------------------------------

function AudioPlayer({ src, showControl }: { src: string; showControl: boolean }) {
  const ref = useRef<HTMLAudioElement>(null)
  const [volume, setVolume] = useState(() => {
    try { return Number(localStorage.getItem('edo:pf-volume') ?? 0.5) } catch { return 0.5 }
  })
  const [muted, setMuted] = useState(false)

  useEffect(() => {
    const a = ref.current
    if (!a) return
    a.volume = volume
    a.muted = muted
    try { localStorage.setItem('edo:pf-volume', String(volume)) } catch { /* ignoré */ }
  }, [volume, muted])
  useEffect(() => { void ref.current?.play().catch(() => {}) }, [src])

  return (
    <>
      <audio ref={ref} src={src} loop />
      {showControl && (
        <div className="pf-volume">
          <button onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Activer le son' : 'Couper le son'}>
            <Icon name={muted || volume === 0 ? 'mute' : 'volume'} size={18} />
          </button>
          <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} aria-label="Volume"
            onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false) }} />
        </div>
      )}
    </>
  )
}

// --- Widgets ----------------------------------------------------------------

const SMALL = new Set(['average', 'subject', 'homework'])

/** Les petites tuiles vont par deux ; une petite tuile sans voisine prend toute la largeur. */
function isWide(widgets: Widget[], i: number) {
  if (!SMALL.has(widgets[i].type)) return true
  let run = 0
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
