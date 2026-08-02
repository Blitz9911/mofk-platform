// ─── Shared Design System ────────────────────────────────────────────────────
import { type ReactNode, type CSSProperties } from 'react'

export const C = {
  bg: '#080808',
  card: '#111111',
  surface: '#181818',
  elevated: '#1e1e1e',
  orange: '#FF6500',
  orangeLight: '#FF8C00',
  orangeGlow: 'rgba(255,101,0,0.15)',
  orangeBorder: 'rgba(255,101,0,0.25)',
  success: '#00C48C',
  warning: '#FFB800',
  error: '#FF3B3B',
  info: '#3B82F6',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.58)',
  textMuted: 'rgba(255,255,255,0.32)',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
} as const

export type Severity = 'success' | 'warning' | 'error' | 'info' | 'muted'

export const severityColor = (s: Severity) => ({
  success: C.success, warning: C.warning, error: C.error, info: C.info, muted: C.textMuted
}[s])

export function Card({ children, style, onClick }: { children: ReactNode; style?: CSSProperties; onClick?: () => void }) {
  return (
    <div onClick={onClick} style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20,
      cursor: onClick ? 'pointer' : undefined, transition: 'border-color 0.2s',
      ...style
    }}>{children}</div>
  )
}

export function SCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div style={{ background: C.surface, borderRadius: 10, padding: '10px 14px', ...style }}>{children}</div>
  )
}

export function Badge({ status, label }: { status: Severity; label: string }) {
  const color = severityColor(status)
  return (
    <span style={{
      background: `${color}18`, color, border: `1px solid ${color}33`,
      borderRadius: 20, padding: '2px 10px', fontSize: 11, fontFamily: 'Cairo, sans-serif', whiteSpace: 'nowrap'
    }}>{label}</span>
  )
}

export function StatusDot({ status, size = 8 }: { status: Severity; size?: number }) {
  const color = severityColor(status)
  return (
    <span style={{
      display: 'inline-block', width: size, height: size, borderRadius: '50%', background: color,
      boxShadow: `0 0 ${size}px ${color}`, flexShrink: 0
    }} />
  )
}

export function Btn({
  children, onClick, variant = 'primary', size = 'md', full = false, style
}: {
  children: ReactNode; onClick?: () => void; variant?: 'primary' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'; full?: boolean; style?: CSSProperties
}) {
  const sizes = { sm: '6px 14px', md: '10px 22px', lg: '13px 32px' }
  const fontSizes = { sm: 12, md: 13, lg: 15 }
  const styles: Record<string, CSSProperties> = {
    primary: { background: C.orange, color: '#000', border: 'none' },
    outline: { background: 'transparent', color: C.orange, border: `1px solid ${C.orangeBorder}` },
    ghost: { background: 'transparent', color: C.textSecondary, border: `1px solid ${C.border}` },
    danger: { background: `${C.error}18`, color: C.error, border: `1px solid ${C.error}33` },
  }
  return (
    <button onClick={onClick} style={{
      ...styles[variant], borderRadius: 9, padding: sizes[size],
      fontSize: fontSizes[size], fontFamily: 'Cairo, sans-serif', fontWeight: 700,
      cursor: 'pointer', width: full ? '100%' : undefined, transition: 'all 0.15s', ...style
    }}>{children}</button>
  )
}

export function Input({ label, placeholder, type = 'text', value, onChange, icon }: {
  label?: string; placeholder?: string; type?: string; value?: string;
  onChange?: (v: string) => void; icon?: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {label && <label style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        {icon && <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>{icon}</span>}
        <input type={type} value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} style={{
          width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9,
          padding: icon ? '11px 40px 11px 14px' : '11px 14px', color: C.textPrimary,
          fontSize: 14, fontFamily: 'Cairo', outline: 'none', direction: 'rtl', boxSizing: 'border-box'
        }} />
      </div>
    </div>
  )
}

export function Divider({ label }: { label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '4px 0' }}>
      <div style={{ flex: 1, height: 1, background: C.border }} />
      {label && <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', whiteSpace: 'nowrap' }}>{label}</span>}
      <div style={{ flex: 1, height: 1, background: C.border }} />
    </div>
  )
}

export function Gauge({ value, max, label, unit, color = C.orange, size = 100 }: {
  value: number; max: number; label: string; unit: string; color?: string; size?: number
}) {
  const r = (size - 14) / 2
  const circ = 2 * Math.PI * r
  const arc = circ * 0.72
  const pct = Math.min(value / max, 1)
  const offset = arc - pct * arc
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(126deg)' }}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.elevated} strokeWidth={9}
            strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round" />
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={9}
            strokeDasharray={`${arc - offset} ${circ - (arc - offset)}`} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: 'stroke-dasharray 0.8s ease' }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center'
        }}>
          <span style={{ fontFamily: 'Orbitron', fontSize: size * 0.2, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
            {value}
          </span>
          <span style={{ fontSize: size * 0.1, color: C.textMuted, marginTop: 2 }}>{unit}</span>
        </div>
      </div>
      <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: 'Cairo' }}>{label}</span>
    </div>
  )
}

export function HealthRing({ score, size = 80 }: { score: number; size?: number }) {
  const color = score >= 80 ? C.success : score >= 60 ? C.warning : C.error
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const arc = circ * (score / 100)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.elevated} strokeWidth={7} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={7}
          strokeDasharray={`${arc} ${circ - arc}`} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color})` }} />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center'
      }}>
        <span style={{ fontFamily: 'Orbitron', fontSize: size * 0.22, fontWeight: 700, color }}>{score}</span>
        <span style={{ fontSize: size * 0.12, color: C.textMuted }}>%</span>
      </div>
    </div>
  )
}

export function ProgressBar({ pct, color = C.orange, height = 4 }: { pct: number; color?: string; height?: number }) {
  const c = pct > 80 ? C.error : pct > 60 ? C.warning : color
  return (
    <div style={{ height, background: C.elevated, borderRadius: height / 2, overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: height / 2, transition: 'width 0.6s ease' }} />
    </div>
  )
}

export function MiniBarChart({ data, labels, color = C.orange, height = 80 }: {
  data: number[]; labels: string[]; color?: string; height?: number
}) {
  const max = Math.max(...data, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((v, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}>
          <div style={{
            width: '100%', background: i === data.length - 1 ? color : `${color}55`,
            borderRadius: '3px 3px 0 0', height: `${(v / max) * (height - 20)}px`,
            boxShadow: i === data.length - 1 ? `0 0 10px ${color}55` : 'none', transition: 'height 0.5s ease'
          }} />
          <span style={{ fontSize: 9, color: C.textMuted, fontFamily: 'Cairo' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

export function SectionHeader({ title, sub, action }: { title: string; sub?: string; action?: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
      <div>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0, fontFamily: 'Cairo' }}>{title}</h2>
        {sub && <p style={{ fontSize: 12, color: C.textMuted, margin: '4px 0 0', fontFamily: 'Cairo' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action?: ReactNode }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ fontSize: 48, marginBottom: 4 }}>{icon}</div>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: C.textPrimary, margin: 0, fontFamily: 'Cairo' }}>{title}</h3>
      <p style={{ fontSize: 13, color: C.textMuted, margin: 0, fontFamily: 'Cairo', maxWidth: 280, lineHeight: 1.7 }}>{desc}</p>
      {action}
    </div>
  )
}

export function OBDStatusBadge({ connected }: { connected: boolean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px',
      background: connected ? `${C.success}15` : `${C.error}15`,
      border: `1px solid ${connected ? C.success : C.error}33`, borderRadius: 20
    }}>
      <StatusDot status={connected ? 'success' : 'error'} size={6} />
      <span style={{ fontSize: 12, color: connected ? C.success : C.error, fontFamily: 'Cairo', fontWeight: 600 }}>
        {connected ? 'جهاز مفك متصل' : 'جهاز غير متصل'}
      </span>
    </div>
  )
}

export function AlertItem({ icon, title, desc, time, severity, action }: {
  icon: string; title: string; desc: string; time: string; severity: Severity; action?: string
}) {
  const color = severityColor(severity)
  return (
    <div style={{
      display: 'flex', gap: 12, padding: '12px 14px', background: C.surface, borderRadius: 10,
      border: `1px solid ${severity === 'error' ? `${C.error}33` : C.border}`,
      alignItems: 'flex-start'
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 9, background: `${color}18`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0
      }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.textPrimary, fontFamily: 'Cairo' }}>{title}</span>
          <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo', flexShrink: 0, marginRight: 8 }}>{time}</span>
        </div>
        <p style={{ fontSize: 12, color: C.textSecondary, margin: 0, fontFamily: 'Cairo', lineHeight: 1.6 }}>{desc}</p>
        {action && (
          <button style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color, fontSize: 11, fontFamily: 'Cairo', padding: '4px 0 0', fontWeight: 600
          }}>{action} ←</button>
        )}
      </div>
    </div>
  )
}
