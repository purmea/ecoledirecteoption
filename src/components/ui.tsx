import type { ReactNode } from 'react'

export function SectionTitle({ children, meta }: { children: ReactNode; meta?: ReactNode }) {
  return (
    <div className="section-title">
      <h2>{children}</h2>
      {meta && <span>{meta}</span>}
    </div>
  )
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle && <p className="subtitle">{subtitle}</p>}
    </header>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}

export function Segmented<T extends string>({ value, options, onChange, label }: {
  value: T
  options: readonly (readonly [T, string])[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="tabs" role="tablist" aria-label={label}>
      {options.map(([k, text]) => (
        <button key={k} role="tab" aria-selected={value === k} onClick={() => onChange(k)}>{text}</button>
      ))}
    </div>
  )
}
