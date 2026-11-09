import { useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { fmt, formatDate } from '../lib'

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [w, setW] = useState(320)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w] as const
}

/** Graduations « rondes » sur l'axe des notes. */
function niceDomain(values: number[]) {
  let lo = Math.floor(Math.min(...values) - 1)
  let hi = Math.ceil(Math.max(...values) + 1)
  lo = Math.max(0, lo)
  hi = Math.min(20, hi)
  if (hi - lo < 4) {
    hi = Math.min(20, lo + 4)
    lo = Math.max(0, hi - 4)
  }
  const step = hi - lo > 8 ? 4 : 2
  lo = Math.floor(lo / step) * step
  hi = Math.ceil(hi / step) * step
  const ticks = []
  for (let t = lo; t <= hi; t += step) ticks.push(t)
  return { lo, hi, ticks }
}

// ---------------------------------------------------------------------------
// Courbe d'évolution (une seule série : le titre de la carte la nomme)

export function TrendChart({ points, label }: { points: { date: string; value: number }[]; label: string }) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  if (points.length < 2) return <p className="chart-empty">Pas encore assez de notes pour tracer une évolution.</p>

  const height = 168
  const m = { t: 14, r: 44, b: 26, l: 30 }
  const iw = Math.max(10, width - m.l - m.r)
  const ih = height - m.t - m.b
  const { lo, hi, ticks } = niceDomain(points.map((p) => p.value))
  const t0 = +new Date(points[0].date)
  const t1 = +new Date(points[points.length - 1].date)
  const x = (d: string) => m.l + (t1 === t0 ? iw / 2 : ((+new Date(d) - t0) / (t1 - t0)) * iw)
  const y = (v: number) => m.t + (1 - (v - lo) / (hi - lo)) * ih
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('')
  const last = points[points.length - 1]
  const xLabels = [points[0], points[Math.floor((points.length - 1) / 2)], last]
    .filter((p, i, a) => a.findIndex((q) => q.date === p.date) === i)

  const nearest = (clientX: number, el: Element) => {
    const px = clientX - el.getBoundingClientRect().left
    let best = 0
    points.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(points[best].date) - px)) best = i })
    return best
  }
  const onMove = (e: PointerEvent<SVGSVGElement>) => setActive(nearest(e.clientX, e.currentTarget))
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const d = e.key === 'ArrowRight' ? 1 : -1
      setActive((a) => Math.min(points.length - 1, Math.max(0, (a ?? points.length - 1) + d)))
    }
  }
  const a = active !== null ? points[active] : null

  return (
    <div className="chart" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={`${label} : ${fmt(last.value)} au ${formatDate(last.date)}`}
        tabIndex={0} onPointerMove={onMove} onPointerLeave={() => setActive(null)} onKeyDown={onKey}
        onFocus={() => setActive(points.length - 1)} onBlur={() => setActive(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={m.l} x2={m.l + iw} y1={y(t)} y2={y(t)} />
            <text className="axis" x={m.l - 8} y={y(t)} dy="0.32em" textAnchor="end">{t}</text>
          </g>
        ))}
        {xLabels.map((p, i) => (
          <text key={p.date} className="axis" x={x(p.date)} y={height - 6}
            textAnchor={i === 0 ? 'start' : i === xLabels.length - 1 ? 'end' : 'middle'}>{formatDate(p.date)}</text>
        ))}
        <path className="series-line" d={path} />
        {a && <line className="crosshair" x1={x(a.date)} x2={x(a.date)} y1={m.t} y2={m.t + ih} />}
        <circle className="series-dot" cx={x((a ?? last).date)} cy={y((a ?? last).value)} r={4.5} />
        {!a && <text className="direct-label" x={x(last.date) + 9} y={y(last.value)} dy="0.32em">{fmt(last.value)}</text>}
      </svg>
      {a && (
        <div className="tooltip" style={{ left: Math.min(Math.max(x(a.date), 60), width - 60), top: Math.max(0, y(a.value) - 58) }}>
          <strong>{fmt(a.value)}</strong>
          <span>{formatDate(a.date, { day: 'numeric', month: 'long' })}</span>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Barres horizontales : moyenne de l'élève (barre) vs moyenne de classe (repère)

export interface SubjectRow {
  subject: string
  average: number
  classAverage: number | null
}

export function SubjectBars({ rows }: { rows: SubjectRow[] }) {
  const [active, setActive] = useState<string | null>(null)
  const hasClass = rows.some((r) => r.classAverage !== null)

  return (
    <div className="bars">
      {hasClass && (
        <div className="legend" aria-hidden="true">
          <span><i className="key-bar" /> Toi</span>
          <span><i className="key-tick" /> Classe</span>
        </div>
      )}
      <ul>
        {rows.map((r) => {
          const on = active === r.subject
          return (
            <li key={r.subject} tabIndex={0} className={on ? 'on' : ''}
              aria-label={`${r.subject} : ${fmt(r.average)} sur 20${r.classAverage !== null ? `, classe ${fmt(r.classAverage)}` : ''}`}
              onPointerEnter={() => setActive(r.subject)} onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(r.subject)} onBlur={() => setActive(null)}>
              <span className="bar-label">{r.subject}</span>
              <span className="bar-track">
                <span className="bar-fill" style={{ width: `${(r.average / 20) * 100}%` }} />
                {r.classAverage !== null && <span className="bar-tick" style={{ left: `${(r.classAverage / 20) * 100}%` }} />}
                {on && r.classAverage !== null && (
                  <span className="tooltip bar-tip" style={{ left: `${(r.average / 20) * 100}%` }}>
                    <strong>{fmt(r.average)}</strong>
                    <span>Classe {fmt(r.classAverage)} · {r.average >= r.classAverage ? '+' : '−'}{fmt(Math.abs(r.average - r.classAverage))}</span>
                  </span>
                )}
              </span>
              <span className="bar-value">{fmt(r.average)}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Mini-courbe (accueil) : pas d'axes, juste la tendance.

export function Sparkline({ points }: { points: { value: number }[] }) {
  if (points.length < 2) return null
  const w = 96
  const h = 32
  const vs = points.map((p) => p.value)
  const lo = Math.min(...vs)
  const hi = Math.max(...vs)
  const span = hi - lo || 1
  const d = vs.map((v, i) => `${i ? 'L' : 'M'}${((i / (vs.length - 1)) * (w - 6) + 3).toFixed(1)},${(h - 3 - ((v - lo) / span) * (h - 6)).toFixed(1)}`).join('')
  return (
    <svg className="sparkline" width={w} height={h} aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
