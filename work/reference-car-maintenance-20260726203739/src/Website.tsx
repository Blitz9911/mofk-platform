import { useState, useEffect } from 'react'
import {
  C, Card, SCard, Badge, StatusDot, Btn, Input, Divider, Gauge, HealthRing,
  ProgressBar, MiniBarChart, EmptyState, OBDStatusBadge, AlertItem
} from './ui'

// ─── Types ───────────────────────────────────────────────────────────────────
type WebPage =
  | 'landing' | 'login' | 'register' | 'forgot'
  | 'dashboard' | 'vehicles' | 'vehicle-detail' | 'live-data'
  | 'diagnostics' | 'maintenance' | 'fuel' | 'expenses'
  | 'reports' | 'alerts' | 'device' | 'subscriptions'
  | 'profile' | 'settings'

interface Vehicle { id: number; name: string; plate: string; year: number; health: number; km: number; fuel: number; connected: boolean }

const VEHICLES: Vehicle[] = [
  { id: 1, name: 'تويوتا كامري', plate: 'حـ ف م 5421', year: 2021, health: 87, km: 87432, fuel: 68, connected: true },
  { id: 2, name: 'هيونداي سوناتا', plate: 'أ ب ج 1122', year: 2020, health: 64, km: 112000, fuel: 32, connected: false },
]

// ─── Sidebar ─────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'dashboard', icon: '⊞', label: 'الرئيسية' },
  { id: 'vehicles', icon: '🚗', label: 'المركبات' },
  { id: 'live-data', icon: '📡', label: 'بيانات مباشرة' },
  { id: 'diagnostics', icon: '🔍', label: 'الأعطال' },
  { id: 'maintenance', icon: '🔧', label: 'الصيانة' },
  { id: 'fuel', icon: '⛽', label: 'الوقود' },
  { id: 'expenses', icon: '💰', label: 'المصروفات' },
  { id: 'reports', icon: '📈', label: 'التقارير' },
  { id: 'alerts', icon: '🔔', label: 'التنبيهات', badge: 3 },
  { id: 'device', icon: '🔌', label: 'جهاز مفك' },
  { id: 'subscriptions', icon: '💎', label: 'الاشتراك' },
]
const NAV_BOTTOM = [
  { id: 'profile', icon: '👤', label: 'الملف الشخصي' },
  { id: 'settings', icon: '⚙️', label: 'الإعدادات' },
]

function Sidebar({ page, setPage }: { page: WebPage; setPage: (p: WebPage) => void }) {
  return (
    <aside style={{
      width: 230, background: C.card, borderLeft: `1px solid ${C.border}`,
      display: 'flex', flexDirection: 'column', padding: '18px 10px', flexShrink: 0,
      overflowY: 'auto', height: '100vh', position: 'sticky', top: 0
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 8px', marginBottom: 28 }}>
        <div style={{
          width: 38, height: 38, background: C.orange, borderRadius: 10,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'Orbitron', fontSize: 13, fontWeight: 700, color: '#000', flexShrink: 0
        }}>M</div>
        <div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 15, fontWeight: 700, color: '#fff', lineHeight: 1.2 }}>
            مفك<span style={{ color: C.orange }}>.</span>
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>Mofk Auto</div>
        </div>
      </div>

      {/* OBD Status */}
      <div style={{ padding: '0 6px', marginBottom: 20 }}>
        <OBDStatusBadge connected={true} />
      </div>

      {/* Nav items */}
      <nav style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        {NAV.map(n => (
          <button key={n.id} onClick={() => setPage(n.id as WebPage)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: page === n.id ? C.orangeGlow : 'transparent',
            border: page === n.id ? `1px solid ${C.orangeBorder}` : '1px solid transparent',
            borderRadius: 9, padding: '9px 12px',
            color: page === n.id ? C.orange : C.textSecondary,
            fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo', textAlign: 'right',
            transition: 'all 0.15s', position: 'relative'
          }}>
            <span style={{ fontSize: 15, flexShrink: 0 }}>{n.icon}</span>
            <span style={{ flex: 1 }}>{n.label}</span>
            {'badge' in n && n.badge && (
              <span style={{
                background: C.error, color: '#fff', borderRadius: 10, fontSize: 9,
                padding: '1px 6px', fontWeight: 700
              }}>{n.badge}</span>
            )}
          </button>
        ))}
      </nav>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 10, marginTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_BOTTOM.map(n => (
          <button key={n.id} onClick={() => setPage(n.id as WebPage)} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: page === n.id ? C.orangeGlow : 'transparent',
            border: page === n.id ? `1px solid ${C.orangeBorder}` : '1px solid transparent',
            borderRadius: 9, padding: '9px 12px',
            color: page === n.id ? C.orange : C.textSecondary,
            fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo',
          }}>
            <span>{n.icon}</span><span>{n.label}</span>
          </button>
        ))}
        {/* User */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
          background: C.surface, borderRadius: 9, marginTop: 6
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', background: C.orange,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14, fontWeight: 700, color: '#000', flexShrink: 0
          }}>أ</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>أحمد الغامدي</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>بلس · مفعّل</div>
          </div>
        </div>
      </div>
    </aside>
  )
}

// ─── Dashboard Header ─────────────────────────────────────────────────────────
function Header({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div style={{
      borderBottom: `1px solid ${C.border}`, padding: '16px 28px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      background: C.bg, position: 'sticky', top: 0, zIndex: 50
    }}>
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'Cairo' }}>{title}</h1>
        {sub && <p style={{ fontSize: 12, color: C.textMuted, margin: '2px 0 0', fontFamily: 'Cairo' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────
function DashboardPage({ setPage }: { setPage: (p: WebPage) => void }) {
  const [liveRPM, setLiveRPM] = useState(2340)
  useEffect(() => {
    const t = setInterval(() => setLiveRPM(v => Math.max(800, Math.min(5500, v + (Math.random() - 0.5) * 300))), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <Header title="مرحباً، أحمد 👋" sub="السبت، 26 يوليو 2025"
        action={<OBDStatusBadge connected={true} />}
      />
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* Critical alert */}
        <div style={{
          background: `${C.error}12`, border: `1px solid ${C.error}44`, borderRadius: 12,
          padding: '12px 18px', display: 'flex', gap: 12, alignItems: 'center'
        }}>
          <span style={{ fontSize: 20 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.error, fontFamily: 'Cairo' }}>عطل يتطلب انتباهك — P0171 · كامري 2021</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginTop: 2 }}>خلط الهواء والوقود غير صحيح — يُنصح بمراجعة الميكانيكي</div>
          </div>
          <Btn variant="danger" size="sm" onClick={() => setPage('diagnostics')}>عرض التفاصيل</Btn>
        </div>

        {/* Vehicle health cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
          {VEHICLES.map(v => (
            <Card key={v.id} onClick={() => setPage('vehicle-detail')} style={{
              border: v.connected ? `1px solid ${C.orangeBorder}` : `1px solid ${C.border}`,
              cursor: 'pointer', transition: 'border-color 0.2s'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{v.plate} · {v.year}</div>
                </div>
                <HealthRing score={v.health} size={64} />
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>المسافة</div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: 14, color: '#fff', marginTop: 2 }}>{v.km.toLocaleString()}<span style={{ fontSize: 10, color: C.textMuted }}> كم</span></div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>الوقود</div>
                  <div style={{ fontFamily: 'Orbitron', fontSize: 14, color: v.fuel < 25 ? C.error : C.orange, marginTop: 2 }}>{v.fuel}<span style={{ fontSize: 10, color: C.textMuted }}>%</span></div>
                </div>
                <div style={{ marginRight: 'auto' }}>
                  <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>الجهاز</div>
                  <div style={{ marginTop: 4 }}><StatusDot status={v.connected ? 'success' : 'muted'} /></div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'أعطال نشطة', value: '2', unit: 'كود', color: C.error, icon: '🔴' },
            { label: 'الصيانة القادمة', value: '12', unit: 'يوم', color: C.warning, icon: '🔧' },
            { label: 'مصروفات الشهر', value: '620', unit: 'ريال', color: C.orange, icon: '💰' },
            { label: 'إجمالي المسافة', value: '199K', unit: 'كم', color: C.info, icon: '📍' },
          ].map(s => (
            <Card key={s.label} style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{s.unit}</span>
              </div>
              <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>{s.label}</div>
            </Card>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Live gauges */}
          <Card>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'Cairo' }}>كامري 2021 — مباشر</h3>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 11, color: C.success }}>
                <div className="blink-anim" style={{ width: 6, height: 6, background: C.success, borderRadius: '50%' }} />مباشر
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', gap: 8 }}>
              <Gauge value={Math.round(liveRPM)} max={6000} label="دورات" unit="RPM" size={90} />
              <Gauge value={85} max={200} label="السرعة" unit="كم/س" color={C.info} size={90} />
              <Gauge value={92} max={120} label="الحرارة" unit="°م" color={C.warning} size={90} />
            </div>
          </Card>

          {/* Upcoming maintenance */}
          <Card>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 14px', fontFamily: 'Cairo' }}>الصيانة القادمة</h3>
            {[
              { name: 'تغيير زيت المحرك', due: 'بعد 12 يوم', pct: 88, car: 'كامري 2021' },
              { name: 'تدوير الإطارات', due: 'بعد 3 أسابيع', pct: 71, car: 'كامري 2021' },
              { name: 'فحص الفرامل', due: 'بعد شهر', pct: 45, car: 'سوناتا 2020' },
            ].map(m => (
              <div key={m.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{m.name}</span>
                  <span style={{ color: m.pct > 80 ? C.error : C.warning, fontFamily: 'Cairo' }}>{m.due}</span>
                </div>
                <ProgressBar pct={m.pct} color={C.orange} height={5} />
              </div>
            ))}
          </Card>
        </div>

        {/* Recent alerts */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#fff', margin: 0, fontFamily: 'Cairo' }}>آخر التنبيهات</h3>
            <Btn variant="ghost" size="sm" onClick={() => setPage('alerts')}>عرض الكل</Btn>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AlertItem icon="🔴" title="عطل — P0171" desc="كامري 2021 · خلط هواء ووقود غير صحيح" time="منذ ساعة" severity="error" action="تشخيص" />
            <AlertItem icon="🟡" title="تغيير الزيت قريباً" desc="كامري 2021 · الموعد بعد 12 يوم أو 500 كم" time="أمس" severity="warning" action="جدولة" />
            <AlertItem icon="🟡" title="ضغط إطار منخفض" desc="سوناتا 2020 · الإطار الأمامي الأيسر 29 PSI" time="2 أيام" severity="warning" />
          </div>
        </Card>
      </div>
    </>
  )
}

// ─── Vehicles Page ────────────────────────────────────────────────────────────
function VehiclesPage({ setPage }: { setPage: (p: WebPage) => void }) {
  return (
    <>
      <Header title="المركبات" sub="إدارة مركباتك المسجلة"
        action={<Btn variant="primary" size="sm">+ إضافة مركبة</Btn>}
      />
      <div style={{ padding: 28 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {VEHICLES.map(v => (
            <Card key={v.id} onClick={() => setPage('vehicle-detail')} style={{ cursor: 'pointer' }}>
              {/* Car graphic */}
              <div style={{
                height: 100, background: C.surface, borderRadius: 10, marginBottom: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48
              }}>🚗</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{v.year} · {v.plate}</div>
                </div>
                <HealthRing score={v.health} size={52} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                {[
                  ['العداد', `${v.km.toLocaleString()} كم`],
                  ['الوقود', `${v.fuel}%`],
                  ['الجهاز', v.connected ? 'متصل' : 'غير متصل'],
                  ['الصيانة', '12 يوم'],
                ].map(([k, val]) => (
                  <SCard key={k} style={{ padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{k}</div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#fff', fontFamily: 'Cairo', marginTop: 2 }}>{val}</div>
                  </SCard>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <Btn full variant="outline" size="sm">عرض التفاصيل</Btn>
                <Btn variant="ghost" size="sm">⋮</Btn>
              </div>
            </Card>
          ))}
          {/* Add new vehicle card */}
          <Card style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            minHeight: 280, border: `2px dashed ${C.border}`, cursor: 'pointer'
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>+</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.textSecondary, fontFamily: 'Cairo' }}>إضافة مركبة جديدة</div>
          </Card>
        </div>
      </div>
    </>
  )
}

// ─── Vehicle Detail Page ──────────────────────────────────────────────────────
function VehicleDetailPage({ setPage: _setPage }: { setPage: (p: WebPage) => void }) {
  const [tab, setTab] = useState('overview')
  const tabs = [
    { id: 'overview', label: 'نظرة عامة' },
    { id: 'live', label: '📡 مباشر' },
    { id: 'dtc', label: '🔍 الأعطال' },
    { id: 'maint', label: '🔧 الصيانة' },
    { id: 'fuel', label: '⛽ الوقود' },
    { id: 'expenses', label: '💰 المصروفات' },
  ]
  const [liveTemp, setLiveTemp] = useState(91)
  useEffect(() => {
    const t = setInterval(() => setLiveTemp(v => +(Math.max(88, Math.min(98, v + (Math.random() - 0.5))).toFixed(1))), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <>
      <Header title="تويوتا كامري 2021" sub="حـ ف م 5421 · 87,432 كم"
        action={<div style={{ display: 'flex', gap: 8 }}><OBDStatusBadge connected={true} /><Btn variant="ghost" size="sm">⋮</Btn></div>}
      />
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, padding: '12px 28px', borderBottom: `1px solid ${C.border}`, background: C.bg, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            background: tab === t.id ? C.orangeGlow : 'transparent',
            border: tab === t.id ? `1px solid ${C.orangeBorder}` : '1px solid transparent',
            borderRadius: 8, padding: '7px 16px', fontFamily: 'Cairo', fontSize: 13,
            color: tab === t.id ? C.orange : C.textSecondary, cursor: 'pointer', whiteSpace: 'nowrap'
          }}>{t.label}</button>
        ))}
      </div>
      <div style={{ padding: 28 }}>
        {tab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <Card>
              <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>معلومات المركبة</h3>
              {[['الماركة', 'تويوتا'], ['الموديل', 'كامري'], ['السنة', '2021'], ['اللون', 'فضي'], ['نوع الوقود', 'بنزين'], ['رقم الشاسيه', '4T1BF1FK0MU123456']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: `1px solid ${C.border}` }}>
                  <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo' }}>{k}</span>
                  <span style={{ fontSize: 12, color: '#fff', fontFamily: 'Cairo' }}>{v}</span>
                </div>
              ))}
            </Card>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Card style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <HealthRing score={87} size={80} />
                <div>
                  <div style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Cairo', marginBottom: 4 }}>صحة المركبة</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>ممتازة</div>
                  <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>2 أعطال نشطة · صيانة بعد 12 يوم</div>
                </div>
              </Card>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: 'حرارة المحرك', value: `${liveTemp}°م`, color: C.warning },
                  { label: 'جهد البطارية', value: '12.7V', color: C.success },
                  { label: 'ضغط زيت المحرك', value: '43 PSI', color: C.success },
                  { label: 'استهلاك الوقود', value: '8.4 ل/100', color: C.orange },
                ].map(s => (
                  <SCard key={s.label}>
                    <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo', marginBottom: 6 }}>{s.label}</div>
                    <div style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </SCard>
                ))}
              </div>
            </div>
          </div>
        )}
        {tab === 'live' && <LiveDataContent />}
        {tab === 'dtc' && <DiagnosticsContent />}
        {tab === 'maint' && <MaintenanceContent />}
        {tab === 'fuel' && <FuelContent compact />}
        {tab === 'expenses' && <ExpensesContent compact />}
      </div>
    </>
  )
}

// ─── Live Data Page ───────────────────────────────────────────────────────────
function LiveDataContent() {
  const [vals, setVals] = useState({
    rpm: 2340, speed: 85, temp: 91.5, fuel: 68, maf: 18.4,
    battery: 12.7, oilPressure: 43, throttle: 28, o2: 0.45, coolant: 91.5
  })
  useEffect(() => {
    const t = setInterval(() => setVals(v => ({
      ...v,
      rpm: Math.round(Math.max(700, Math.min(5500, v.rpm + (Math.random() - 0.5) * 250))),
      speed: Math.round(Math.max(0, Math.min(160, v.speed + (Math.random() - 0.5) * 4))),
      temp: +(Math.max(88, Math.min(98, v.temp + (Math.random() - 0.5) * 0.4)).toFixed(1)),
      maf: +(Math.max(10, Math.min(30, v.maf + (Math.random() - 0.5) * 0.8)).toFixed(1)),
    })), 1500)
    return () => clearInterval(t)
  }, [])
  const sensors = [
    { label: 'دورات المحرك (RPM)', value: vals.rpm, unit: 'RPM', max: 6000, color: C.orange, live: true },
    { label: 'السرعة الفورية', value: vals.speed, unit: 'كم/س', max: 200, color: C.info, live: true },
    { label: 'حرارة المحرك', value: vals.temp, unit: '°م', max: 120, color: C.warning, live: true },
    { label: 'مستوى الوقود', value: vals.fuel, unit: '%', max: 100, color: C.orange, live: false },
    { label: 'تدفق الهواء (MAF)', value: vals.maf, unit: 'g/s', max: 40, color: C.info, live: true },
    { label: 'جهد البطارية', value: vals.battery, unit: 'V', max: 15, color: C.success, live: false },
    { label: 'ضغط زيت المحرك', value: vals.oilPressure, unit: 'PSI', max: 80, color: C.success, live: false },
    { label: 'فتحة الخانق (TPS)', value: vals.throttle, unit: '%', max: 100, color: C.warning, live: true },
  ]
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <div className="blink-anim" style={{ width: 8, height: 8, background: C.success, borderRadius: '50%' }} />
          <span style={{ fontSize: 13, color: C.success, fontFamily: 'Cairo' }}>بيانات مباشرة من جهاز مفك</span>
        </div>
        <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'JetBrains Mono' }}>تحديث كل 1.5 ثانية</span>
      </div>
      {/* Big gauges */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 16, padding: '8px 0' }}>
          <Gauge value={vals.rpm} max={6000} label="دورات المحرك" unit="RPM" size={120} />
          <Gauge value={vals.speed} max={200} label="السرعة" unit="كم/س" color={C.info} size={120} />
          <Gauge value={vals.temp} max={120} label="الحرارة" unit="°م" color={C.warning} size={120} />
          <Gauge value={vals.fuel} max={100} label="الوقود" unit="%" color={C.success} size={120} />
        </div>
      </Card>
      {/* Sensor grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {sensors.map(s => (
          <SCard key={s.label} style={{ border: `1px solid ${s.live ? `${s.color}22` : C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo', flex: 1, lineHeight: 1.4 }}>{s.label}</span>
              {s.live && <div className="blink-anim" style={{ width: 5, height: 5, background: s.color, borderRadius: '50%', flexShrink: 0, marginTop: 2 }} />}
            </div>
            <div style={{ fontFamily: 'Orbitron', fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted }}>{s.unit}</div>
            <ProgressBar pct={(+s.value / s.max) * 100} color={s.color} height={3} />
          </SCard>
        ))}
      </div>
    </>
  )
}

function LiveDataPage() {
  return (
    <>
      <Header title="البيانات المباشرة" sub="قراءات حية من جهاز مفك OBD-II" />
      <div style={{ padding: 28 }}><LiveDataContent /></div>
    </>
  )
}

// ─── Diagnostics ──────────────────────────────────────────────────────────────
function DiagnosticsContent() {
  const [selected, setSelected] = useState<string | null>(null)
  const codes = [
    { code: 'P0171', desc: 'خلط الهواء والوقود ضعيف — الضفة الأولى', system: 'نظام الوقود', severity: 'error' as const, fix: 'فحص حساس MAF وحاقنات الوقود والتسرب من المانع' },
    { code: 'P0420', desc: 'كفاءة المحول الحفاز أقل من الحد المطلوب', system: 'نظام العادم', severity: 'warning' as const, fix: 'استبدال المحول الحفاز أو فحص حساسات الأكسجين' },
    { code: 'P0456', desc: 'تسرب صغير في نظام تبخر الوقود', system: 'نظام الوقود', severity: 'warning' as const, fix: 'فحص غطاء خزان الوقود والأنابيب' },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1fr' : '1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge status="error" label={`${codes.filter(c => c.severity === 'error').length} حرج`} />
            <Badge status="warning" label={`${codes.filter(c => c.severity === 'warning').length} تحذير`} />
          </div>
          <Btn variant="outline" size="sm">🔍 فحص جديد</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {codes.map(c => (
            <div key={c.code} onClick={() => setSelected(selected === c.code ? null : c.code)} style={{
              background: C.surface, borderRadius: 10, padding: '10px 14px',
              border: `1px solid ${c.severity === 'error' ? `${C.error}44` : `${C.warning}33`}`,
              cursor: 'pointer'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <code style={{ fontFamily: 'JetBrains Mono', fontSize: 15, color: c.severity === 'error' ? C.error : C.warning, fontWeight: 700 }}>{c.code}</code>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <Badge status={c.severity} label={c.system} />
                  <Btn variant="ghost" size="sm">مسح ⌫</Btn>
                </div>
              </div>
              <p style={{ fontSize: 13, color: C.textSecondary, margin: 0, fontFamily: 'Cairo' }}>{c.desc}</p>
            </div>
          ))}
          {codes.length === 0 && <EmptyState icon="✅" title="لا توجد أعطال" desc="السيارة بحالة ممتازة. لم يتم اكتشاف أي أكواد أعطال." />}
        </div>
      </div>
      {selected && (() => {
        const c = codes.find(x => x.code === selected)!
        return (
          <Card style={{ border: `1px solid ${c.severity === 'error' ? `${C.error}44` : `${C.warning}33`}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <code style={{ fontFamily: 'JetBrains Mono', fontSize: 20, color: c.severity === 'error' ? C.error : C.warning, fontWeight: 700 }}>{c.code}</code>
              <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: C.textMuted, cursor: 'pointer', fontSize: 16 }}>✕</button>
            </div>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 15, color: '#fff', margin: '0 0 8px' }}>{c.desc}</h3>
            <Badge status={c.severity} label={c.system} />
            <Divider label="التوصية" />
            <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>{c.fix}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <Btn full variant="primary" size="sm">🤖 اسأل المساعد</Btn>
              <Btn full variant="danger" size="sm">مسح الكود</Btn>
            </div>
          </Card>
        )
      })()}
    </div>
  )
}

function DiagnosticsPage() {
  return (
    <>
      <Header title="الأعطال وأكواد OBD-II" sub="تشخيص مبني على بيانات حية من الجهاز" />
      <div style={{ padding: 28 }}><DiagnosticsContent /></div>
    </>
  )
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
function MaintenanceContent() {
  const items = [
    { name: 'تغيير زيت المحرك', last: '82,400 كم', next: '87,400 كم', dueIn: '12 يوم', pct: 88, status: 'warning' as const },
    { name: 'تغيير فلتر الهواء', last: '75,000 كم', next: '90,000 كم', dueIn: '3 أشهر', pct: 55, status: 'success' as const },
    { name: 'تدوير الإطارات', last: '80,000 كم', next: '90,000 كم', dueIn: '3 أسابيع', pct: 72, status: 'warning' as const },
    { name: 'فحص الفرامل', last: '70,000 كم', next: '90,000 كم', dueIn: '4 أشهر', pct: 38, status: 'success' as const },
    { name: 'تغيير سائل التبريد', last: '60,000 كم', next: '90,000 كم', dueIn: '6 أشهر', pct: 25, status: 'success' as const },
  ]
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Btn variant="primary" size="sm">+ تسجيل صيانة</Btn>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {items.map(m => (
          <SCard key={m.name} style={{ border: `1px solid ${m.status === 'warning' ? `${C.warning}33` : C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Badge status={m.status} label={m.status === 'warning' ? 'يقترب' : 'جيد'} />
                <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{m.name}</span>
              </div>
              <span style={{ fontSize: 12, color: m.pct > 70 ? C.warning : C.textMuted, fontFamily: 'Cairo' }}>بعد {m.dueIn}</span>
            </div>
            <ProgressBar pct={m.pct} height={5} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>
              <span>آخر صيانة: {m.last}</span><span>التالية: {m.next}</span>
            </div>
          </SCard>
        ))}
      </div>
    </>
  )
}

function MaintenancePage() {
  return (
    <>
      <Header title="الصيانة الدورية" sub="سجل وتتبع خدمات مركباتك" />
      <div style={{ padding: 28 }}><MaintenanceContent /></div>
    </>
  )
}

// ─── Fuel ─────────────────────────────────────────────────────────────────────
function FuelContent({ compact = false }: { compact?: boolean }) {
  const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو']
  const data = [9.2, 8.8, 9.5, 8.4, 8.1, 8.6, 8.4]
  const fills = [
    { date: '25 يوليو', liters: 45, cost: 168.75, station: 'أرامكو — الملك فهد', km: '87,310' },
    { date: '10 يوليو', liters: 52, cost: 195, station: 'أرامكو — العليا', km: '86,988' },
    { date: '28 يونيو', liters: 48, cost: 180, station: 'أرامكو — الغدير', km: '86,703' },
  ]
  return (
    <>
      {!compact && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'معدل الاستهلاك', value: '8.4', unit: 'ل/100كم', color: C.orange },
          { label: 'تكلفة هذا الشهر', value: '314', unit: 'ريال', color: C.warning },
          { label: 'إجمالي السنة', value: '2,283', unit: 'ريال', color: C.info },
          { label: 'تعبئات هذا الشهر', value: '2', unit: 'مرة', color: C.success },
        ].map(s => (
          <Card key={s.label} style={{ padding: 16 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{s.unit}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginTop: 6 }}>{s.label}</div>
          </Card>
        ))}
      </div>}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '2fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: 0 }}>الاستهلاك الشهري (ل/100كم)</h3>
          </div>
          <MiniBarChart data={data} labels={months} height={100} />
        </Card>
        {!compact && (
          <Card>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 14px' }}>مستوى الوقود</h3>
            <Gauge value={68} max={100} label="الخزان الحالي" unit="%" color={C.orange} size={100} />
            <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>≈ 340 كم متبقية</div>
          </Card>
        )}
      </div>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: 0 }}>سجل التعبئة</h3>
          <Btn variant="primary" size="sm">+ تسجيل تعبئة</Btn>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {fills.map((f, i) => (
            <SCard key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 2fr', gap: 12, alignItems: 'center' }}>
              <span style={{ fontFamily: 'Cairo', fontSize: 12, color: C.textSecondary }}>{f.date}</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: C.orange }}>{f.liters} ل</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: C.warning }}>{f.cost} ريال</span>
              <span style={{ fontFamily: 'Cairo', fontSize: 11, color: C.textMuted }}>{f.station}</span>
            </SCard>
          ))}
        </div>
      </Card>
    </>
  )
}

function FuelPage() {
  return (
    <>
      <Header title="الوقود والاستهلاك" sub="تتبع استهلاك البنزين وتكاليفه"
        action={<Btn variant="primary" size="sm">+ تسجيل تعبئة</Btn>}
      />
      <div style={{ padding: 28 }}><FuelContent /></div>
    </>
  )
}

// ─── Expenses ─────────────────────────────────────────────────────────────────
function ExpensesContent({ compact = false }: { compact?: boolean }) {
  const cats = [
    { label: 'الوقود', amount: 314, pct: 51, color: C.orange },
    { label: 'الصيانة', amount: 180, pct: 29, color: C.warning },
    { label: 'الغسيل', amount: 60, pct: 10, color: C.info },
    { label: 'أخرى', amount: 66, pct: 10, color: C.textMuted },
  ]
  const transactions = [
    { desc: 'تعبئة وقود', date: '25 يوليو', amount: -168.75, type: '⛽' },
    { desc: 'تغيير زيت', date: '20 يوليو', amount: -120, type: '🔧' },
    { desc: 'غسيل السيارة', date: '18 يوليو', amount: -30, type: '🚿' },
    { desc: 'تعبئة وقود', date: '10 يوليو', amount: -195, type: '⛽' },
  ]
  return (
    <>
      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'مصروفات هذا الشهر', value: '620', unit: 'ريال', color: C.orange },
            { label: 'مصروفات هذا العام', value: '7,840', unit: 'ريال', color: C.warning },
            { label: 'متوسط شهري', value: '653', unit: 'ريال', color: C.info },
          ].map(s => (
            <Card key={s.label} style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{s.unit}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginTop: 6 }}>{s.label}</div>
            </Card>
          ))}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>توزيع المصروفات</h3>
          {cats.map(c => (
            <div key={c.label} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{c.label}</span>
                <span style={{ color: c.color, fontFamily: 'Orbitron' }}>{c.amount} ريال</span>
              </div>
              <ProgressBar pct={c.pct} color={c.color} height={5} />
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 14px' }}>آخر المعاملات</h3>
          {transactions.map((t, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span>{t.type}</span>
                <div>
                  <div style={{ fontSize: 12, color: '#fff', fontFamily: 'Cairo' }}>{t.desc}</div>
                  <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{t.date}</div>
                </div>
              </div>
              <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: C.error }}>{t.amount} ريال</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  )
}

function ExpensesPage() {
  return (
    <>
      <Header title="المصروفات" sub="تتبع تكاليف مركباتك" action={<Btn variant="primary" size="sm">+ إضافة مصروف</Btn>} />
      <div style={{ padding: 28 }}><ExpensesContent /></div>
    </>
  )
}

// ─── Reports ──────────────────────────────────────────────────────────────────
function ReportsPage() {
  const [period, setPeriod] = useState<'week' | 'month' | 'year'>('month')
  const mData = [8.2, 8.8, 9.5, 8.4, 8.1, 8.6, 8.4]
  const mLabels = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو']
  const costData = [580, 620, 710, 540, 490, 620, 620]
  return (
    <>
      <Header title="التقارير والإحصائيات" sub="تحليل شامل لأداء مركباتك"
        action={
          <div style={{ display: 'flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: 3, gap: 3 }}>
            {(['week', 'month', 'year'] as const).map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                background: period === p ? C.orange : 'transparent', color: period === p ? '#000' : C.textSecondary,
                border: 'none', borderRadius: 6, padding: '6px 14px', fontFamily: 'Cairo', fontSize: 12, cursor: 'pointer'
              }}>{p === 'week' ? 'أسبوع' : p === 'month' ? 'شهر' : 'سنة'}</button>
            ))}
          </div>
        }
      />
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {[
            { label: 'مسافة مقطوعة', value: '1,842', unit: 'كم', color: C.orange },
            { label: 'استهلاك الوقود', value: '154.7', unit: 'لتر', color: C.warning },
            { label: 'إجمالي المصروفات', value: '620', unit: 'ريال', color: C.error },
            { label: 'معدل الاستهلاك', value: '8.4', unit: 'ل/100كم', color: C.info },
          ].map(s => (
            <Card key={s.label} style={{ padding: 16 }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 20, fontWeight: 700, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{s.unit}</div>
              <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginTop: 6 }}>{s.label}</div>
            </Card>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Card>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>استهلاك الوقود الشهري</h3>
            <MiniBarChart data={mData} labels={mLabels} height={120} />
          </Card>
          <Card>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>المصروفات الشهرية (ريال)</h3>
            <MiniBarChart data={costData} labels={mLabels} color={C.warning} height={120} />
          </Card>
        </div>
      </div>
    </>
  )
}

// ─── Alerts Page ──────────────────────────────────────────────────────────────
function AlertsPage() {
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all')
  const alerts = [
    { icon: '🔴', title: 'عطل — P0171', desc: 'كامري 2021 · خلط هواء ووقود غير صحيح في الضفة الأولى', time: 'منذ ساعة', severity: 'error' as const, action: 'عرض التشخيص' },
    { icon: '🔴', title: 'عطل — P0420', desc: 'كامري 2021 · كفاءة المحول الحفاز منخفضة', time: 'منذ 3 ساعات', severity: 'error' as const },
    { icon: '🟡', title: 'تغيير الزيت قريباً', desc: 'كامري 2021 · بعد 12 يوم أو 500 كم', time: 'أمس', severity: 'warning' as const, action: 'جدولة صيانة' },
    { icon: '🟡', title: 'ضغط إطار منخفض', desc: 'سوناتا 2020 · الإطار الأمامي الأيسر 29 PSI (الموصى 32)', time: 'يومان', severity: 'warning' as const },
    { icon: '🟡', title: 'تدوير الإطارات', desc: 'كامري 2021 · قريباً خلال 3 أسابيع', time: '3 أيام', severity: 'warning' as const },
    { icon: '🔵', title: 'مزامنة بيانات ناجحة', desc: 'تم تحديث بيانات كامري 2021 بنجاح', time: '5 أيام', severity: 'info' as const },
  ]
  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter)
  return (
    <>
      <Header title="التنبيهات" sub="إشعارات وتحذيرات مركباتك" />
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {([['all', 'الكل'], ['error', 'حرجة'], ['warning', 'تحذيرات'], ['info', 'معلومات']] as const).map(([f, l]) => (
            <button key={f} onClick={() => setFilter(f)} style={{
              background: filter === f ? C.orangeGlow : C.surface,
              border: `1px solid ${filter === f ? C.orangeBorder : C.border}`,
              borderRadius: 8, padding: '7px 16px', fontFamily: 'Cairo', fontSize: 13,
              color: filter === f ? C.orange : C.textSecondary, cursor: 'pointer'
            }}>{l}</button>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((a, i) => <AlertItem key={i} {...a} />)}
        </div>
      </div>
    </>
  )
}

// ─── Device Page ──────────────────────────────────────────────────────────────
function DevicePage() {
  const [step, setStep] = useState<'connected' | 'scanning' | 'found'>('connected')
  return (
    <>
      <Header title="جهاز مفك OBD-II" sub="إدارة وربط أجهزة التشخيص" />
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 15, color: '#fff', margin: 0 }}>الجهاز المتصل</h3>
            <Badge status="success" label="متصل" />
          </div>
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
            <div style={{
              width: 70, height: 70, background: C.surface, borderRadius: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32,
              border: `2px solid ${C.orangeBorder}`, flexShrink: 0
            }}>🔌</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>مفك Pro v2</div>
              <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>SN: MFK-2024-98731</div>
              <div style={{ fontSize: 11, color: C.success, marginTop: 4, fontFamily: 'Cairo' }}>📶 إشارة ممتازة</div>
            </div>
          </div>
          {[['البروتوكول', 'OBD-II ISO 15765-4'], ['اتصال', 'Bluetooth 5.0'], ['الفيرموير', 'v3.2.1 (آخر إصدار)'], ['بطارية الجهاز', '78%'], ['المركبة المربوطة', 'كامري 2021']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
              <span style={{ color: C.textMuted, fontFamily: 'Cairo' }}>{k}</span>
              <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
            <Btn variant="outline" full size="sm">فصل الجهاز</Btn>
            <Btn variant="ghost" size="sm">إعادة ضبط</Btn>
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 15, color: '#fff', margin: '0 0 16px' }}>إضافة جهاز جديد</h3>
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>📡</div>
            {step === 'connected' && <>
              <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary, marginBottom: 20 }}>شبّك جهاز مفك بمقبس OBD-II في سيارتك ثم اضغط بحث</p>
              <Btn variant="primary" onClick={() => setStep('scanning')}>🔍 بدء البحث عن جهاز</Btn>
            </>}
            {step === 'scanning' && <>
              <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.orange, marginBottom: 20 }}>
                <span className="blink-anim" style={{ display: 'inline-block' }}>⟳</span> جاري البحث عبر Bluetooth...
              </p>
              <Btn variant="ghost" onClick={() => { setStep('found') }}>محاكاة: تم العثور على جهاز</Btn>
            </>}
            {step === 'found' && <>
              <div style={{ background: `${C.success}15`, border: `1px solid ${C.success}44`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.success, fontFamily: 'Cairo' }}>✓ تم العثور على جهاز مفك Mini</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>MAC: B4:E6:2D:8A:11:FF</div>
              </div>
              <Btn variant="primary" onClick={() => setStep('connected')}>ربط الجهاز</Btn>
            </>}
          </div>
        </Card>
      </div>
    </>
  )
}

// ─── Subscriptions Page ───────────────────────────────────────────────────────
function SubscriptionsPage() {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const plans = [
    {
      name: 'مجاني', priceM: 0, priceY: 0, color: C.textMuted, desc: 'للتجربة',
      features: ['3 مركبات', 'تشخيص أساسي', 'سجل صيانة', '—', '—', '—', '—'],
      current: false
    },
    {
      name: 'بلس', priceM: 29, priceY: 199, color: C.orange, desc: 'الأكثر شيوعاً',
      features: ['5 مركبات', 'تشخيص متقدم', 'سجل صيانة', 'تتبع الوقود', 'مساعد AI', 'تقارير متقدمة', '—'],
      current: true
    },
    {
      name: 'برو', priceM: 79, priceY: 549, color: '#7c3aed', desc: 'للأساطيل',
      features: ['مركبات غير محدودة', 'تشخيص متقدم', 'سجل صيانة', 'تتبع الوقود', 'مساعد AI', 'تقارير متقدمة', 'إدارة الأساطيل'],
      current: false
    },
  ]
  const featureLabels = ['عدد المركبات', 'التشخيص', 'الصيانة', 'الوقود', 'مساعد AI', 'التقارير', 'الأساطيل']
  return (
    <>
      <Header title="الاشتراك والباقات" sub="اشتراكك الحالي: بلس · ينتهي 26 يناير 2026" />
      <div style={{ padding: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 4, gap: 4 }}>
            {(['monthly', 'yearly'] as const).map(b => (
              <button key={b} onClick={() => setBilling(b)} style={{
                background: billing === b ? C.orange : 'transparent', color: billing === b ? '#000' : C.textSecondary,
                border: 'none', borderRadius: 8, padding: '8px 20px', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700, cursor: 'pointer'
              }}>{b === 'monthly' ? 'شهري' : 'سنوي (وفر 30%)'}</button>
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, maxWidth: 900, margin: '0 auto' }}>
          {plans.map((p) => (
            <Card key={p.name} style={{
              border: p.current ? `2px solid ${C.orange}` : `1px solid ${C.border}`,
              boxShadow: p.current ? `0 0 30px ${C.orangeGlow}` : 'none',
              position: 'relative'
            }}>
              {p.current && (
                <div style={{
                  position: 'absolute', top: -1, right: 20,
                  background: C.orange, color: '#000', fontSize: 10, fontWeight: 700,
                  padding: '3px 12px', borderRadius: '0 0 8px 8px'
                }}>اشتراكك الحالي</div>
              )}
              <div style={{ marginBottom: 6, fontSize: 12, color: C.textMuted, fontFamily: 'Cairo' }}>{p.desc}</div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#fff', fontFamily: 'Cairo', margin: '0 0 12px' }}>{p.name}</h3>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 20 }}>
                <span style={{ fontFamily: 'Orbitron', fontSize: 32, fontWeight: 700, color: p.color }}>
                  {billing === 'monthly' ? p.priceM : p.priceY}
                </span>
                <span style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo' }}>ريال/{billing === 'monthly' ? 'شهر' : 'سنة'}</span>
              </div>
              {p.features.map((f, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '5px 0', fontSize: 12 }}>
                  <span style={{ color: f === '—' ? C.border : p.color, fontSize: 13, width: 14 }}>{f === '—' ? '✕' : '✓'}</span>
                  <span style={{ color: f === '—' ? C.textMuted : C.textSecondary, fontFamily: 'Cairo' }}>
                    {featureLabels[i]}{f !== '—' && f !== '✓' && f !== 'متاح' ? `: ${f}` : ''}
                  </span>
                </div>
              ))}
              <Btn full variant={p.current ? 'ghost' : 'outline'} size="md" style={{ marginTop: 20, borderColor: p.color, color: p.current ? C.textMuted : p.color }}>
                {p.current ? 'اشتراكك الحالي' : p.priceM === 0 ? 'استخدام مجاناً' : 'ترقية الآن'}
              </Btn>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Profile Page ─────────────────────────────────────────────────────────────
function ProfilePage() {
  return (
    <>
      <Header title="الملف الشخصي" />
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 24 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card style={{ textAlign: 'center', padding: 28 }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', background: C.orange,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 32, fontWeight: 700, color: '#000', margin: '0 auto 14px'
            }}>أ</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>أحمد محمد الغامدي</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>ahmed.alghamdi@example.com</div>
            <div style={{ marginTop: 10 }}><Badge status="warning" label="بلس" /></div>
            <Btn variant="outline" size="sm" style={{ marginTop: 16 }}>تغيير الصورة</Btn>
          </Card>
          <Card>
            <h3 style={{ fontFamily: 'Cairo', fontSize: 13, color: '#fff', margin: '0 0 12px' }}>إحصائياتي</h3>
            {[['المركبات', '2'], ['الأعطال المحلولة', '14'], ['الصيانات المسجلة', '32'], ['تعبئات الوقود', '87']].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${C.border}`, fontSize: 12 }}>
                <span style={{ color: C.textMuted, fontFamily: 'Cairo' }}>{k}</span>
                <span style={{ color: C.orange, fontFamily: 'Orbitron', fontSize: 13 }}>{v}</span>
              </div>
            ))}
          </Card>
        </div>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 15, color: '#fff', margin: '0 0 20px' }}>تعديل البيانات الشخصية</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label="الاسم الأول" value="أحمد" icon="👤" />
              <Input label="اسم العائلة" value="الغامدي" icon="👤" />
            </div>
            <Input label="البريد الإلكتروني" value="ahmed.alghamdi@example.com" type="email" icon="✉️" />
            <Input label="رقم الجوال" value="+966 55 123 4567" type="tel" icon="📱" />
            <Input label="المدينة" value="الرياض" icon="📍" />
            <Divider label="كلمة المرور" />
            <Input label="كلمة المرور الحالية" placeholder="••••••••" type="password" icon="🔒" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <Input label="كلمة المرور الجديدة" placeholder="••••••••" type="password" />
              <Input label="تأكيد كلمة المرور" placeholder="••••••••" type="password" />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Btn variant="primary">حفظ التغييرات</Btn>
              <Btn variant="ghost">إلغاء</Btn>
            </div>
          </div>
        </Card>
      </div>
    </>
  )
}

// ─── Settings Page ────────────────────────────────────────────────────────────
function SettingsPage() {
  const [notifs, setNotifs] = useState({ faults: true, maintenance: true, fuel: false, reports: false })
  const [lang, setLang] = useState<'ar' | 'en'>('ar')
  return (
    <>
      <Header title="الإعدادات" />
      <div style={{ padding: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>اللغة والمنطقة</h3>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['ar', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                flex: 1, background: lang === l ? C.orangeGlow : C.surface,
                border: `1px solid ${lang === l ? C.orangeBorder : C.border}`,
                borderRadius: 8, padding: '10px', fontFamily: 'Cairo', fontSize: 13,
                color: lang === l ? C.orange : C.textSecondary, cursor: 'pointer'
              }}>{l === 'ar' ? '🇸🇦 العربية' : '🇺🇸 English'}</button>
            ))}
          </div>
        </Card>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>الإشعارات</h3>
          {([
            ['faults', 'تنبيهات الأعطال', 'عند اكتشاف كود عطل جديد'],
            ['maintenance', 'تذكير الصيانة', 'قبل موعد الصيانة بأسبوع'],
            ['fuel', 'تنبيه الوقود', 'عند انخفاض الوقود عن 20%'],
            ['reports', 'التقارير الأسبوعية', 'ملخص أسبوعي لأداء المركبة'],
          ] as const).map(([k, label, desc]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo' }}>{label}</div>
                <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{desc}</div>
              </div>
              <div
                onClick={() => setNotifs(n => ({ ...n, [k]: !n[k] }))}
                style={{
                  width: 40, height: 22, borderRadius: 11, cursor: 'pointer',
                  background: notifs[k] ? C.orange : C.elevated, position: 'relative', transition: 'background 0.2s'
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff',
                  position: 'absolute', top: 3, right: notifs[k] ? 3 : 21, transition: 'right 0.2s'
                }} />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>وحدات القياس</h3>
          {[['وحدة المسافة', 'كيلومتر (كم)'], ['وحدة الوقود', 'لتر (ل)'], ['وحدة الضغط', 'PSI'], ['وحدة الحرارة', 'سيلسيوس (°م)']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.textSecondary, fontFamily: 'Cairo' }}>{k}</span>
              <span style={{ color: C.orange, fontFamily: 'Cairo', cursor: 'pointer' }}>{v} ▾</span>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ fontFamily: 'Cairo', fontSize: 14, color: '#fff', margin: '0 0 16px' }}>عن التطبيق</h3>
          {[['الإصدار', '2.4.1'], ['آخر تحديث', '20 يوليو 2025'], ['جهاز مفك SDK', 'v3.2.1']].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}`, fontSize: 13 }}>
              <span style={{ color: C.textSecondary, fontFamily: 'Cairo' }}>{k}</span>
              <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 16 }}>
            <Btn variant="ghost" full size="sm">سياسة الخصوصية</Btn>
            <Btn variant="ghost" full size="sm">شروط الاستخدام</Btn>
            <Btn variant="danger" full size="sm">تسجيل الخروج</Btn>
          </div>
        </Card>
      </div>
    </>
  )
}

// ─── Public: Landing ──────────────────────────────────────────────────────────
function LandingPage({ setPage }: { setPage: (p: WebPage) => void }) {
  const features = [
    { icon: '🔌', title: 'تشخيص OBD-II فوري', desc: 'اقرأ أكواد الأعطال وفهم مشاكل سيارتك في ثوانٍ بدقة 98%', color: C.orange },
    { icon: '🔧', title: 'صيانة ذكية', desc: 'تتبع مواعيد الصيانة تلقائياً واستقبل تذكيرات قبل أي موعد', color: C.success },
    { icon: '🤖', title: 'مساعد AI', desc: 'اسأل عن أي مشكلة واحصل على توصيات دقيقة مبنية على بيانات سيارتك', color: '#7c3aed' },
    { icon: '⛽', title: 'تتبع الوقود', desc: 'راقب الاستهلاك وقارن الصرفية وتحكم في تكاليف الوقود', color: C.warning },
    { icon: '💰', title: 'إدارة المصروفات', desc: 'سجّل وتتبع كل مصروفات سيارتك من وقود وصيانة وإضافات', color: C.info },
    { icon: '🚐', title: 'إدارة الأساطيل', desc: 'تحكم في أسطول مركباتك بالكامل من مكان واحد مع تقارير مفصلة', color: '#ec4899' },
  ]
  return (
    <div style={{ minHeight: '100vh', background: C.bg, direction: 'rtl', fontFamily: 'Cairo' }}>
      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,8,0.92)',
        backdropFilter: 'blur(20px)', borderBottom: `1px solid ${C.border}`,
        padding: '0 6%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, background: C.orange, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontSize: 14, fontWeight: 700, color: '#000' }}>M</div>
          <span style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: '#fff' }}>مفك<span style={{ color: C.orange }}>.</span></span>
        </div>
        <div style={{ display: 'flex', gap: 24 }}>
          {['المميزات', 'الأسعار', 'تواصل معنا'].map(l => (
            <a key={l} href="#" style={{ color: C.textSecondary, fontSize: 13, textDecoration: 'none' }}>{l}</a>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Btn variant="ghost" size="sm" onClick={() => setPage('login')}>تسجيل الدخول</Btn>
          <Btn variant="primary" size="sm" onClick={() => setPage('register')}>ابدأ مجاناً</Btn>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ padding: '100px 6% 80px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 60, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '10%', left: '50%', width: 700, height: 700, background: 'radial-gradient(circle, rgba(255,101,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, opacity: 0.03, backgroundImage: 'linear-gradient(rgba(255,101,0,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,101,0,1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'inline-block', background: `${C.orange}18`, border: `1px solid ${C.orangeBorder}`, borderRadius: 20, padding: '4px 14px', fontSize: 12, color: C.orange, marginBottom: 24 }}>🔌 تقنية OBD-II الذكية</div>
          <h1 style={{ fontSize: 54, fontWeight: 900, lineHeight: 1.15, color: '#fff', marginBottom: 20 }}>
            سيارتك بين<br /><span style={{ color: C.orange }}>يديك دائماً</span>
          </h1>
          <p style={{ fontSize: 17, color: C.textSecondary, lineHeight: 1.85, maxWidth: 500, marginBottom: 36 }}>
            جهاز مفك OBD-II يشبّك بسيارتك ويعطيك صورة كاملة عن صحتها. تشخيص فوري، صيانة ذكية، ومساعد AI معك على الدوام.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 52 }}>
            <Btn variant="primary" size="lg" onClick={() => setPage('dashboard')}>ابدأ مجاناً ←</Btn>
            <Btn variant="outline" size="lg">شاهد كيف يعمل</Btn>
          </div>
          <div style={{ display: 'flex', gap: 40 }}>
            {[['+50K', 'مستخدم'], ['98%', 'دقة التشخيص'], ['30%', 'توفير']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontFamily: 'Orbitron', fontSize: 24, fontWeight: 700, color: C.orange }}>{v}</div>
                <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        {/* Mock dashboard preview */}
        <div style={{ position: 'relative' }}>
          <div style={{
            background: C.card, border: `1px solid ${C.orangeBorder}`, borderRadius: 16, padding: 24,
            boxShadow: `0 0 60px rgba(255,101,0,0.12)`
          }} className="float-anim">
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.success, boxShadow: `0 0 6px ${C.success}` }} />
              <span style={{ fontSize: 12, color: C.success, fontFamily: 'Cairo' }}>مفك متصل · كامري 2021</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', marginBottom: 20 }}>
              <Gauge value={2340} max={6000} label="RPM" unit="" size={80} />
              <Gauge value={85} max={200} label="سرعة" unit="كم/س" color={C.info} size={80} />
              <Gauge value={68} max={100} label="وقود" unit="%" color={C.success} size={80} />
            </div>
            <div style={{ background: `${C.error}12`, border: `1px solid ${C.error}33`, borderRadius: 8, padding: '8px 12px', marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: C.error, fontFamily: 'Cairo' }}>⚠️ P0171 — خلط الهواء والوقود</div>
            </div>
            <div style={{ background: `${C.warning}12`, border: `1px solid ${C.warning}33`, borderRadius: 8, padding: '8px 12px' }}>
              <div style={{ fontSize: 11, color: C.warning, fontFamily: 'Cairo' }}>🔧 تغيير الزيت — بعد 12 يوم</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '80px 6%', borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ textAlign: 'center', fontSize: 38, fontWeight: 900, color: '#fff', marginBottom: 56 }}>
          كل ما تحتاجه <span style={{ color: C.orange }}>في مكان واحد</span>
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {features.map(f => (
            <Card key={f.title}>
              <div style={{ width: 48, height: 48, background: `${f.color}18`, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 14, border: `1px solid ${f.color}33` }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 8, fontFamily: 'Cairo' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.75, margin: 0, fontFamily: 'Cairo' }}>{f.desc}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{ padding: '80px 6%', textAlign: 'center', borderTop: `1px solid ${C.border}` }}>
        <h2 style={{ fontSize: 38, fontWeight: 900, color: '#fff', marginBottom: 16 }}>جاهز تبدأ؟</h2>
        <p style={{ fontSize: 15, color: C.textSecondary, marginBottom: 32, fontFamily: 'Cairo' }}>أنشئ حسابك مجاناً وشبّك جهاز مفك بسيارتك خلال دقيقتين</p>
        <Btn variant="primary" size="lg" onClick={() => setPage('register')}>إنشاء حساب مجاني →</Btn>
      </div>

      {/* Footer */}
      <div style={{ borderTop: `1px solid ${C.border}`, padding: '28px 6%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, background: C.orange, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontSize: 11, fontWeight: 700, color: '#000' }}>M</div>
          <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: '#fff' }}>مفك<span style={{ color: C.orange }}>.</span></span>
        </div>
        <p style={{ fontSize: 11, color: C.textMuted }}>© 2025 مفك — Mofk. جميع الحقوق محفوظة</p>
      </div>
    </div>
  )
}

// ─── Auth Pages ───────────────────────────────────────────────────────────────
function AuthPage({ mode, setPage }: { mode: 'login' | 'register' | 'forgot'; setPage: (p: WebPage) => void }) {
  const [email, setEmail] = useState('')
  const [pass, setPass] = useState('')
  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', direction: 'rtl' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,101,0,0.05) 0%, transparent 60%)' }} />
      <div style={{ width: '100%', maxWidth: 420, padding: '0 20px', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, background: C.orange, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontSize: 20, fontWeight: 700, color: '#000', margin: '0 auto 14px' }}>M</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: '#fff', margin: 0, fontFamily: 'Cairo' }}>
            {mode === 'login' ? 'تسجيل الدخول' : mode === 'register' ? 'إنشاء حساب' : 'استعادة كلمة المرور'}
          </h1>
          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6, fontFamily: 'Cairo' }}>
            {mode === 'login' ? 'مرحباً بعودتك' : mode === 'register' ? 'ابدأ رحلتك مع مفك مجاناً' : 'أدخل بريدك الإلكتروني'}
          </p>
        </div>
        <Card style={{ padding: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {mode === 'register' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Input label="الاسم الأول" placeholder="أحمد" icon="👤" />
                <Input label="اسم العائلة" placeholder="الغامدي" icon="👤" />
              </div>
            )}
            {mode === 'register' && <Input label="رقم الجوال" placeholder="+966 55 xxx xxxx" type="tel" icon="📱" />}
            <Input label="البريد الإلكتروني" placeholder="ahmed@example.com" type="email" value={email} onChange={setEmail} icon="✉️" />
            {mode !== 'forgot' && <Input label="كلمة المرور" placeholder="••••••••" type="password" value={pass} onChange={setPass} icon="🔒" />}
            {mode === 'register' && <Input label="تأكيد كلمة المرور" placeholder="••••••••" type="password" icon="🔒" />}
            {mode === 'login' && (
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setPage('forgot')} style={{ background: 'none', border: 'none', color: C.orange, fontSize: 12, cursor: 'pointer', fontFamily: 'Cairo' }}>نسيت كلمة المرور؟</button>
              </div>
            )}
            <Btn variant="primary" full onClick={() => setPage('dashboard')}>
              {mode === 'login' ? 'تسجيل الدخول' : mode === 'register' ? 'إنشاء الحساب' : 'إرسال رابط الاستعادة'}
            </Btn>
            {mode !== 'forgot' && <Divider label="أو" />}
            {mode !== 'forgot' && (
              <button style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 9, padding: '11px', fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <span>G</span> المتابعة بحساب Google
              </button>
            )}
          </div>
          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: C.textMuted, fontFamily: 'Cairo' }}>
            {mode === 'login' ? (
              <span>ليس لديك حساب؟ <button onClick={() => setPage('register')} style={{ background: 'none', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: 'Cairo', fontSize: 13 }}>إنشاء حساب</button></span>
            ) : (
              <span>لديك حساب؟ <button onClick={() => setPage('login')} style={{ background: 'none', border: 'none', color: C.orange, cursor: 'pointer', fontFamily: 'Cairo', fontSize: 13 }}>تسجيل الدخول</button></span>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Website Shell ────────────────────────────────────────────────────────────
export function Website({ onSwitchMobile }: { onSwitchMobile: () => void }) {
  const [page, setPage] = useState<WebPage>('landing')
  const publicPages = ['landing', 'login', 'register', 'forgot']
  const isPublic = publicPages.includes(page)

  if (page === 'landing') return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 1000 }}>
        <Btn variant="outline" size="sm" onClick={onSwitchMobile}>📱 تطبيق الجوال</Btn>
      </div>
      <LandingPage setPage={setPage} />
    </div>
  )
  if (isPublic) return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'fixed', top: 16, left: 16, zIndex: 1000 }}>
        <Btn variant="ghost" size="sm" onClick={() => setPage('landing')}>← الرئيسية</Btn>
      </div>
      <AuthPage mode={page as any} setPage={setPage} />
    </div>
  )

  return (
    <div style={{ display: 'flex', height: '100vh', background: C.bg, direction: 'rtl', overflow: 'hidden' }}>
      <Sidebar page={page} setPage={setPage} />
      <main style={{ flex: 1, overflowY: 'auto', background: C.bg }}>
        {/* Mode switcher */}
        <div style={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Btn variant="outline" size="sm" onClick={onSwitchMobile}>📱 جوال</Btn>
          <Btn variant="ghost" size="sm" onClick={() => setPage('landing')}>🌐 موقع</Btn>
        </div>
        {page === 'dashboard' && <DashboardPage setPage={setPage} />}
        {page === 'vehicles' && <VehiclesPage setPage={setPage} />}
        {page === 'vehicle-detail' && <VehicleDetailPage setPage={setPage} />}
        {page === 'live-data' && <LiveDataPage />}
        {page === 'diagnostics' && <DiagnosticsPage />}
        {page === 'maintenance' && <MaintenancePage />}
        {page === 'fuel' && <FuelPage />}
        {page === 'expenses' && <ExpensesPage />}
        {page === 'reports' && <ReportsPage />}
        {page === 'alerts' && <AlertsPage />}
        {page === 'device' && <DevicePage />}
        {page === 'subscriptions' && <SubscriptionsPage />}
        {page === 'profile' && <ProfilePage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  )
}
