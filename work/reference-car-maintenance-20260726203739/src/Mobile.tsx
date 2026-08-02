import { useState, useEffect, useRef } from 'react'
import { C, Badge, Btn, Gauge, HealthRing, ProgressBar, MiniBarChart, AlertItem } from './ui'

// ─── Types ────────────────────────────────────────────────────────────────────
type MobileScreen =
  | 'splash' | 'onboarding' | 'login' | 'register'
  | 'home' | 'vehicle' | 'live-data' | 'dtc' | 'dtc-detail'
  | 'maintenance' | 'add-maintenance' | 'fuel' | 'add-fuel'
  | 'ai' | 'obd-connect' | 'alerts' | 'profile' | 'settings' | 'subscriptions'

type BottomTab = 'home' | 'vehicle' | 'dtc' | 'ai' | 'profile'

// ─── Phone Frame ──────────────────────────────────────────────────────────────
function PhoneFrame({ children, screen }: { children: React.ReactNode; screen: MobileScreen }) {
  const noFrame = screen === 'splash' || screen === 'onboarding'
  return (
    <div style={{
      width: 390, minHeight: 844, background: C.bg, borderRadius: noFrame ? 0 : 44,
      overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column',
      border: noFrame ? 'none' : `2px solid ${C.border}`,
      boxShadow: '0 40px 80px rgba(0,0,0,0.7)',
    }}>
      {/* Status bar */}
      {!noFrame && (
        <div style={{
          height: 44, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', background: C.bg, flexShrink: 0
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>9:41</span>
          <div style={{ width: 120, height: 28, background: '#000', borderRadius: 20, position: 'absolute', left: '50%', transform: 'translateX(-50%)', top: 8 }} />
          <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 10, color: '#fff' }}>📶</span>
            <span style={{ fontSize: 10, color: '#fff' }}>🔋</span>
          </div>
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>{children}</div>
    </div>
  )
}

// ─── Top Bar ──────────────────────────────────────────────────────────────────
function TopBar({ title, back, right }: { title: string; back?: () => void; right?: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: C.bg, flexShrink: 0
    }}>
      {back
        ? <button onClick={back} style={{ background: 'none', border: 'none', color: C.orange, cursor: 'pointer', fontSize: 20 }}>←</button>
        : <div style={{ width: 24 }} />}
      <h2 style={{ fontSize: 16, fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'Cairo' }}>{title}</h2>
      {right || <div style={{ width: 24 }} />}
    </div>
  )
}

// ─── Bottom Navigation ────────────────────────────────────────────────────────
function BottomNav({ active, onChange }: { active: BottomTab; onChange: (t: BottomTab) => void }) {
  const tabs: { id: BottomTab; icon: string; label: string; badge?: number }[] = [
    { id: 'home', icon: '⊞', label: 'الرئيسية' },
    { id: 'vehicle', icon: '🚗', label: 'سيارتي' },
    { id: 'dtc', icon: '🔍', label: 'الأعطال', badge: 2 },
    { id: 'ai', icon: '🤖', label: 'مساعد' },
    { id: 'profile', icon: '👤', label: 'حسابي' },
  ]
  return (
    <div style={{
      display: 'flex', background: C.card, borderTop: `1px solid ${C.border}`,
      padding: '8px 4px 20px', flexShrink: 0
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', position: 'relative'
        }}>
          {t.badge && (
            <span style={{
              position: 'absolute', top: 0, right: '28%',
              background: C.error, color: '#fff', borderRadius: 8, fontSize: 8,
              padding: '1px 4px', fontWeight: 700
            }}>{t.badge}</span>
          )}
          <span style={{ fontSize: 20 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontFamily: 'Cairo', color: active === t.id ? C.orange : C.textMuted }}>{t.label}</span>
          {active === t.id && <div style={{ position: 'absolute', bottom: -8, width: 20, height: 2, background: C.orange, borderRadius: 1 }} />}
        </button>
      ))}
    </div>
  )
}

// ─── SCREENS ──────────────────────────────────────────────────────────────────

// Splash
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 2000); return () => clearTimeout(t) }, [])
  return (
    <div style={{
      height: 844, display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center',
      background: `radial-gradient(ellipse at center, rgba(255,101,0,0.12) 0%, ${C.bg} 65%)`
    }}>
      <div style={{ width: 80, height: 80, background: C.orange, borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontSize: 32, fontWeight: 700, color: '#000', marginBottom: 16, boxShadow: `0 0 40px ${C.orange}44` }}>M</div>
      <div style={{ fontFamily: 'Orbitron', fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: 2 }}>مفك</div>
      <div style={{ fontFamily: 'Cairo', fontSize: 14, color: C.textMuted, marginTop: 6 }}>Mofk Auto</div>
      <div style={{ position: 'absolute', bottom: 60, display: 'flex', gap: 6 }}>
        {[1, 2, 3].map(i => (
          <div key={i} className="blink-anim" style={{ width: 6, height: 6, borderRadius: '50%', background: i === 2 ? C.orange : C.textMuted, animationDelay: `${i * 0.3}s` }} />
        ))}
      </div>
    </div>
  )
}

// Onboarding
function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0)
  const steps = [
    { icon: '🔌', title: 'شبّك جهاز مفك', desc: 'أدخل قطعة OBD-II في مقبس التشخيص تحت الداشبورد وانتظر ثانيتين', color: C.orange },
    { icon: '📡', title: 'بيانات حية فوراً', desc: 'شاهد RPM والسرعة والحرارة والوقود مباشرةً من محرك سيارتك', color: C.info },
    { icon: '🤖', title: 'مساعد ذكي معك', desc: 'اسأل عن أي عطل واحصل على تشخيص دقيق وتوصيات من AI', color: '#7c3aed' },
  ]
  const s = steps[step]
  return (
    <div style={{ height: 844, display: 'flex', flexDirection: 'column', background: C.bg }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <div style={{
          width: 140, height: 140, borderRadius: 36, background: `${s.color}18`,
          border: `2px solid ${s.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 64, marginBottom: 36
        }}>{s.icon}</div>
        <h2 style={{ fontFamily: 'Cairo', fontSize: 26, fontWeight: 900, color: '#fff', textAlign: 'center', marginBottom: 14 }}>{s.title}</h2>
        <p style={{ fontFamily: 'Cairo', fontSize: 15, color: C.textSecondary, textAlign: 'center', lineHeight: 1.8, maxWidth: 300 }}>{s.desc}</p>
      </div>
      <div style={{ padding: '0 28px 44px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {steps.map((_, i) => (
            <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? s.color : C.elevated, transition: 'all 0.3s' }} />
          ))}
        </div>
        <button onClick={() => step < 2 ? setStep(s => s + 1) : onDone()} style={{
          width: '100%', background: s.color, color: '#000', border: 'none', borderRadius: 14,
          padding: '16px', fontFamily: 'Cairo', fontSize: 16, fontWeight: 700, cursor: 'pointer'
        }}>{step < 2 ? 'التالي ←' : 'ابدأ الآن →'}</button>
        {step < 2 && (
          <button onClick={onDone} style={{
            width: '100%', background: 'none', border: 'none', color: C.textMuted,
            fontFamily: 'Cairo', fontSize: 13, cursor: 'pointer', marginTop: 12, padding: 8
          }}>تخطي</button>
        )}
      </div>
    </div>
  )
}

// Login
function LoginScreen({ onLogin }: { onLogin: () => void }) {
  return (
    <div style={{ flex: 1, padding: '32px 24px', display: 'flex', flexDirection: 'column' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ width: 52, height: 52, background: C.orange, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Orbitron', fontSize: 20, fontWeight: 700, color: '#000', margin: '0 auto 14px' }}>M</div>
        <h1 style={{ fontFamily: 'Cairo', fontSize: 24, fontWeight: 900, color: '#fff', margin: 0 }}>تسجيل الدخول</h1>
        <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textMuted, marginTop: 6 }}>مرحباً بعودتك 👋</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div>
          <label style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginBottom: 6, display: 'block' }}>البريد الإلكتروني</label>
          <input placeholder="ahmed@example.com" style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }} />
        </div>
        <div>
          <label style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginBottom: 6, display: 'block' }}>كلمة المرور</label>
          <input type="password" placeholder="••••••••" style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px 16px', color: '#fff', fontSize: 14, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box' }} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <button style={{ background: 'none', border: 'none', color: C.orange, fontSize: 12, cursor: 'pointer', fontFamily: 'Cairo' }}>نسيت كلمة المرور؟</button>
        </div>
        <button onClick={onLogin} style={{
          width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 14,
          padding: '15px', fontFamily: 'Cairo', fontSize: 16, fontWeight: 700, cursor: 'pointer', marginTop: 8
        }}>دخول</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>أو</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>
        <button style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14, padding: '14px', fontFamily: 'Cairo', fontSize: 14, color: C.textSecondary, cursor: 'pointer' }}>G المتابعة بـ Google</button>
        <p style={{ textAlign: 'center', fontFamily: 'Cairo', fontSize: 13, color: C.textMuted, marginTop: 8 }}>
          ليس لديك حساب؟ <span style={{ color: C.orange, cursor: 'pointer' }}>إنشاء حساب</span>
        </p>
      </div>
    </div>
  )
}

// Home Screen
function HomeScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  return (
    <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>أهلاً، أحمد 👋</div>
          <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo' }}>السبت، 26 يوليو 2025</div>
        </div>
        <button onClick={() => setScreen('alerts')} style={{ background: `${C.error}18`, border: `1px solid ${C.error}33`, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', position: 'relative' }}>
          <span>🔔</span>
          <div style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, background: C.error, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff', fontWeight: 700 }}>3</div>
        </button>
      </div>

      {/* OBD Status */}
      <div style={{
        background: `${C.success}12`, border: `1px solid ${C.success}33`, borderRadius: 12,
        padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10
      }}>
        <div className="blink-anim" style={{ width: 8, height: 8, background: C.success, borderRadius: '50%' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.success, fontFamily: 'Cairo' }}>مفك متصل</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>تويوتا كامري 2021</div>
        </div>
        <span style={{ fontFamily: 'Orbitron', fontSize: 11, color: C.success }}>BLE 5.0</span>
      </div>

      {/* Critical alert */}
      <div onClick={() => setScreen('dtc')} style={{
        background: `${C.error}12`, border: `1px solid ${C.error}44`, borderRadius: 12,
        padding: '12px 14px', cursor: 'pointer', display: 'flex', gap: 10, alignItems: 'center'
      }}>
        <span style={{ fontSize: 20 }}>⚠️</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.error, fontFamily: 'Cairo' }}>2 أعطال نشطة — اضغط للتفاصيل</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>P0171 · P0420</div>
        </div>
        <span style={{ color: C.error }}>←</span>
      </div>

      {/* Vehicle card */}
      <div onClick={() => setScreen('vehicle')} style={{
        background: `linear-gradient(135deg, ${C.card}, ${C.surface})`,
        border: `1px solid ${C.orangeBorder}`, borderRadius: 16, padding: 18, cursor: 'pointer'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>تويوتا كامري</div>
            <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>2021 · حـ ف م 5421</div>
          </div>
          <HealthRing score={87} size={56} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {[
            ['الوقود', '68%', C.success],
            ['البطارية', '12.7V', C.info],
            ['الحرارة', '92°م', C.warning],
          ].map(([l, v, c]) => (
            <div key={l} style={{ background: C.bg, borderRadius: 10, padding: '8px 10px', textAlign: 'center' }}>
              <div style={{ fontFamily: 'Orbitron', fontSize: 13, color: c as string, fontWeight: 700 }}>{v}</div>
              <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
        {[
          { icon: '📡', label: 'مباشر', screen: 'live-data' as MobileScreen },
          { icon: '🔧', label: 'صيانة', screen: 'maintenance' as MobileScreen },
          { icon: '⛽', label: 'وقود', screen: 'fuel' as MobileScreen },
          { icon: '🔌', label: 'الجهاز', screen: 'obd-connect' as MobileScreen },
        ].map(a => (
          <button key={a.label} onClick={() => setScreen(a.screen)} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '12px 8px', display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: 6, cursor: 'pointer'
          }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ fontSize: 11, color: C.textSecondary, fontFamily: 'Cairo' }}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent activity */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <h3 style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>آخر النشاطات</h3>
        {[
          { icon: '🔴', text: 'عطل P0171 مكتشف', time: 'منذ ساعة', color: C.error },
          { icon: '⛽', text: 'تعبئة وقود 45 لتر', time: 'أمس', color: C.warning },
          { icon: '🔧', text: 'تغيير زيت مسجل', time: '3 أيام', color: C.success },
        ].map((a, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none', alignItems: 'center' }}>
            <span>{a.icon}</span>
            <span style={{ flex: 1, fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo' }}>{a.text}</span>
            <span style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// Vehicle Dashboard
function VehicleScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  const [liveRPM, setLiveRPM] = useState(2340)
  useEffect(() => {
    const t = setInterval(() => setLiveRPM(v => Math.round(Math.max(700, Math.min(5500, v + (Math.random() - 0.5) * 300)))), 2000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Car header */}
      <div style={{ textAlign: 'center', padding: '12px 0' }}>
        <div style={{ fontSize: 64, marginBottom: 8 }}>🚗</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'Cairo' }}>تويوتا كامري 2021</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>حـ ف م 5421 · 87,432 كم</div>
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'center', gap: 8 }}>
          <Badge status="success" label="متصل" />
          <Badge status="warning" label="2 أعطال" />
        </div>
      </div>
      {/* Health ring */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20, display: 'flex', alignItems: 'center', gap: 20 }}>
        <HealthRing score={87} size={80} />
        <div>
          <div style={{ fontSize: 13, color: C.textMuted, fontFamily: 'Cairo', marginBottom: 4 }}>صحة المركبة</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', fontFamily: 'Cairo' }}>ممتازة</div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4, lineHeight: 1.6 }}>آخر فحص: منذ 3 ساعات<br />الصيانة القادمة: 12 يوم</div>
        </div>
      </div>
      {/* Live gauges */}
      <div style={{ background: C.card, border: `1px solid ${C.orangeBorder}`, borderRadius: 16, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>البيانات الحية</div>
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <div className="blink-anim" style={{ width: 6, height: 6, background: C.success, borderRadius: '50%' }} />
            <span style={{ fontSize: 11, color: C.success, fontFamily: 'Cairo' }}>مباشر</span>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-around' }}>
          <Gauge value={liveRPM} max={6000} label="دورات" unit="RPM" size={80} />
          <Gauge value={85} max={200} label="سرعة" unit="كم/س" color={C.info} size={80} />
          <Gauge value={68} max={100} label="وقود" unit="%" color={C.success} size={80} />
        </div>
      </div>
      {/* Quick nav */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { icon: '📡', label: 'بيانات مباشرة كاملة', screen: 'live-data' as MobileScreen, color: C.info },
          { icon: '🔍', label: 'أكواد الأعطال', screen: 'dtc' as MobileScreen, color: C.error },
          { icon: '🔧', label: 'سجل الصيانة', screen: 'maintenance' as MobileScreen, color: C.warning },
          { icon: '⛽', label: 'سجل الوقود', screen: 'fuel' as MobileScreen, color: C.orange },
        ].map(a => (
          <button key={a.label} onClick={() => setScreen(a.screen)} style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
            padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center',
            cursor: 'pointer', textAlign: 'right'
          }}>
            <span style={{ fontSize: 22 }}>{a.icon}</span>
            <span style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo' }}>{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// Live Data Screen
function LiveDataScreen() {
  const [vals, setVals] = useState({ rpm: 2340, speed: 85, temp: 91.5, fuel: 68, battery: 12.7, maf: 18.4, throttle: 28 })
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
    { label: 'دورات المحرك', value: vals.rpm, unit: 'RPM', max: 6000, color: C.orange, live: true },
    { label: 'السرعة', value: vals.speed, unit: 'كم/س', max: 200, color: C.info, live: true },
    { label: 'حرارة المحرك', value: vals.temp, unit: '°م', max: 120, color: C.warning, live: true },
    { label: 'مستوى الوقود', value: vals.fuel, unit: '%', max: 100, color: C.orange, live: false },
    { label: 'جهد البطارية', value: vals.battery, unit: 'V', max: 15, color: C.success, live: false },
    { label: 'تدفق الهواء', value: vals.maf, unit: 'g/s', max: 40, color: C.info, live: true },
    { label: 'فتحة الخانق', value: vals.throttle, unit: '%', max: 100, color: C.warning, live: true },
  ]
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0' }}>
        <Gauge value={vals.rpm} max={6000} label="RPM" unit="" size={90} />
        <Gauge value={vals.speed} max={200} label="كم/س" unit="" color={C.info} size={90} />
        <Gauge value={vals.temp} max={120} label="°م" unit="" color={C.warning} size={90} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {sensors.map(s => (
          <div key={s.label} style={{
            background: C.surface, border: `1px solid ${s.live ? `${s.color}22` : C.border}`,
            borderRadius: 10, padding: '10px 14px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {s.live && <div className="blink-anim" style={{ width: 6, height: 6, background: s.color, borderRadius: '50%' }} />}
              <span style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Cairo' }}>{s.label}</span>
            </div>
            <div style={{ textAlign: 'left' }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 10, color: C.textMuted, marginRight: 4 }}>{s.unit}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// DTC Codes Screen
function DTCScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  const codes = [
    { code: 'P0171', desc: 'خلط الهواء والوقود ضعيف', system: 'نظام الوقود', severity: 'error' as const },
    { code: 'P0420', desc: 'كفاءة المحول الحفاز منخفضة', system: 'نظام العادم', severity: 'warning' as const },
    { code: 'P0456', desc: 'تسرب صغير في نظام التبخر', system: 'نظام الوقود', severity: 'warning' as const },
  ]
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        <Badge status="error" label={`${codes.filter(c => c.severity === 'error').length} حرج`} />
        <Badge status="warning" label={`${codes.filter(c => c.severity === 'warning').length} تحذير`} />
        <div style={{ flex: 1 }} />
        <button style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '4px 12px', color: C.orange, fontSize: 12, fontFamily: 'Cairo', cursor: 'pointer' }}>🔍 فحص</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {codes.map(c => (
          <div key={c.code} onClick={() => setScreen('dtc-detail')} style={{
            background: C.surface, border: `1px solid ${c.severity === 'error' ? `${C.error}44` : `${C.warning}33`}`,
            borderRadius: 12, padding: 14, cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <code style={{ fontFamily: 'JetBrains Mono', fontSize: 18, color: c.severity === 'error' ? C.error : C.warning, fontWeight: 700 }}>{c.code}</code>
              <Badge status={c.severity} label={c.severity === 'error' ? 'حرج' : 'تحذير'} />
            </div>
            <div style={{ fontSize: 13, color: C.textSecondary, fontFamily: 'Cairo', marginBottom: 6 }}>{c.desc}</div>
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>النظام: {c.system}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// DTC Detail Screen
function DTCDetailScreen({ back: _back }: { back: () => void }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ textAlign: 'center', padding: '20px 0 24px' }}>
        <code style={{ fontFamily: 'JetBrains Mono', fontSize: 36, fontWeight: 700, color: C.error, display: 'block', marginBottom: 8 }}>P0171</code>
        <Badge status="error" label="عطل حرج" />
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${C.border}` }}>
        <h3 style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>وصف العطل</h3>
        <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>نسبة خلط الهواء بالوقود غير صحيحة في الضفة الأولى من المحرك. يتلقى المحرك هواءً أكثر من الكمية المطلوبة.</p>
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 18, marginBottom: 12, border: `1px solid ${C.border}` }}>
        <h3 style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 12px' }}>الأسباب المحتملة</h3>
        {['تسرب في مانع تسرب السحب', 'حساس MAF متسخ أو معطوب', 'حاقن وقود مسدود', 'ضغط وقود منخفض'].map((c, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, padding: '6px 0', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ color: C.error, fontSize: 12 }}>•</span>
            <span style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary }}>{c}</span>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, borderRadius: 14, padding: 18, border: `1px solid ${C.border}`, marginBottom: 20 }}>
        <h3 style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>التوصية</h3>
        <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>فحص مانع تسرب السحب أولاً، ثم تنظيف حساس MAF. إذا استمر العطل، فحص حاقنات الوقود.</p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button style={{ width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🤖 استشر المساعد الذكي</button>
        <button style={{ width: '100%', background: `${C.error}18`, color: C.error, border: `1px solid ${C.error}44`, borderRadius: 12, padding: '14px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>مسح الكود</button>
      </div>
    </div>
  )
}

// Maintenance Screen
function MaintenanceScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  const items = [
    { name: 'تغيير زيت المحرك', dueIn: '12 يوم', pct: 88, status: 'warning' as const },
    { name: 'تدوير الإطارات', dueIn: '3 أسابيع', pct: 72, status: 'warning' as const },
    { name: 'فلتر الهواء', dueIn: '3 أشهر', pct: 45, status: 'success' as const },
    { name: 'فلتر الوقود', dueIn: '6 أشهر', pct: 28, status: 'success' as const },
    { name: 'فحص الفرامل', dueIn: '4 أشهر', pct: 35, status: 'success' as const },
  ]
  const history = [
    { name: 'تغيير زيت المحرك', date: '15 أبريل 2025', km: '82,400' },
    { name: 'تغيير فلتر الهواء', date: '10 يناير 2025', km: '75,000' },
    { name: 'تدوير الإطارات', date: '5 مارس 2025', km: '80,000' },
  ]
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <button onClick={() => setScreen('add-maintenance')} style={{
        width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12,
        padding: '13px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer'
      }}>+ تسجيل صيانة جديدة</button>
      <h3 style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>الصيانة القادمة</h3>
      {items.map(m => (
        <div key={m.name} style={{
          background: C.surface, border: `1px solid ${m.status === 'warning' ? `${C.warning}33` : C.border}`,
          borderRadius: 12, padding: '12px 14px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{m.name}</span>
            <span style={{ fontSize: 12, color: m.pct > 70 ? C.warning : C.textMuted, fontFamily: 'Cairo' }}>بعد {m.dueIn}</span>
          </div>
          <ProgressBar pct={m.pct} height={4} />
        </div>
      ))}
      <h3 style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: '#fff', margin: '6px 0 0' }}>السجل السابق</h3>
      {history.map((h, i) => (
        <div key={i} style={{ background: C.surface, borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: '#fff', fontFamily: 'Cairo' }}>{h.name}</div>
            <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{h.date}</div>
          </div>
          <div style={{ fontFamily: 'Orbitron', fontSize: 12, color: C.textMuted }}>{h.km} كم</div>
        </div>
      ))}
    </div>
  )
}

// Add Maintenance Screen
function AddMaintenanceScreen({ back }: { back: () => void }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textMuted, margin: 0 }}>سجّل عملية صيانة لتويوتا كامري 2021</p>
      {[
        { label: 'نوع الصيانة', placeholder: 'مثال: تغيير زيت المحرك', type: 'text' },
        { label: 'التاريخ', placeholder: '2025-07-26', type: 'date' },
        { label: 'قراءة العداد (كم)', placeholder: '87,432', type: 'number' },
        { label: 'التكلفة (ريال)', placeholder: '120', type: 'number' },
        { label: 'مركز الخدمة', placeholder: 'مثال: صيانة تويوتا الرياض', type: 'text' },
        { label: 'ملاحظات', placeholder: 'ملاحظات إضافية...', type: 'text' },
      ].map(f => (
        <div key={f.label}>
          <label style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginBottom: 6, display: 'block' }}>{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }} />
        </div>
      ))}
      <button onClick={back} style={{ width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>حفظ الصيانة</button>
    </div>
  )
}

// Fuel Screen
function FuelScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  const fills = [
    { date: '25 يوليو', liters: 45, cost: 168.75, km: '87,310', station: 'أرامكو — الملك فهد' },
    { date: '10 يوليو', liters: 52, cost: 195, km: '86,988', station: 'أرامكو — العليا' },
    { date: '28 يونيو', liters: 48, cost: 180, km: '86,703', station: 'أرامكو — الغدير' },
    { date: '12 يونيو', liters: 50, cost: 187.5, km: '86,410', station: 'أرامكو — الروضة' },
  ]
  const mData = [9.2, 8.8, 9.5, 8.4, 8.1, 8.6, 8.4]
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        {[
          { label: 'معدل الاستهلاك', value: '8.4', unit: 'ل/100كم', color: C.orange },
          { label: 'تكلفة الشهر', value: '314', unit: 'ريال', color: C.warning },
        ].map(s => (
          <div key={s.label} style={{ background: C.surface, borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 10, color: C.textMuted, fontFamily: 'Cairo' }}>{s.unit}</div>
            <div style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {/* Mini chart */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo', marginBottom: 12 }}>الاستهلاك الشهري (ل/100كم)</div>
        <MiniBarChart data={mData} labels={['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو']} height={80} />
      </div>
      <button onClick={() => setScreen('add-fuel')} style={{ width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>+ تسجيل تعبئة وقود</button>
      <h3 style={{ fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: '#fff', margin: 0 }}>سجل التعبئة</h3>
      {fills.map((f, i) => (
        <div key={i} style={{ background: C.surface, borderRadius: 12, padding: '12px 14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Cairo' }}>{f.date}</span>
            <div style={{ display: 'flex', gap: 10 }}>
              <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: C.orange }}>{f.liters} ل</span>
              <span style={{ fontFamily: 'Orbitron', fontSize: 13, color: C.warning }}>{f.cost} ريال</span>
            </div>
          </div>
          <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo' }}>{f.station}</div>
        </div>
      ))}
    </div>
  )
}

// Add Fuel Screen
function AddFuelScreen({ back }: { back: () => void }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {[
        { label: 'التاريخ', placeholder: '2025-07-26', type: 'date' },
        { label: 'كمية الوقود (لتر)', placeholder: '45', type: 'number' },
        { label: 'التكلفة الإجمالية (ريال)', placeholder: '168.75', type: 'number' },
        { label: 'قراءة العداد (كم)', placeholder: '87,432', type: 'number' },
        { label: 'محطة الوقود', placeholder: 'مثال: أرامكو — الملك فهد', type: 'text' },
      ].map(f => (
        <div key={f.label}>
          <label style={{ fontSize: 12, color: C.textSecondary, fontFamily: 'Cairo', marginBottom: 6, display: 'block' }}>{f.label}</label>
          <input type={f.type} placeholder={f.placeholder} style={{ width: '100%', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 14px', color: '#fff', fontSize: 13, fontFamily: 'Cairo', outline: 'none', boxSizing: 'border-box', direction: 'rtl' }} />
        </div>
      ))}
      <button onClick={back} style={{ width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12, padding: '14px', fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, cursor: 'pointer', marginTop: 8 }}>حفظ التعبئة</button>
    </div>
  )
}

// AI Screen
function AIScreen() {
  const [msgs, setMsgs] = useState([
    { role: 'ai', text: 'أهلاً! أنا مساعدك الذكي. اسألني عن أي عطل أو مشكلة في سيارتك.' },
    { role: 'user', text: 'ماذا يعني كود P0171؟' },
    { role: 'ai', text: 'كود P0171 يعني خلط الهواء والوقود غير متوازن. الأسباب الشائعة:\n\n• تسرب في مانع تسرب السحب\n• حساس MAF متسخ\n• حاقن وقود مسدود\n\nابدأ بفحص التسربات أولاً.' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)
  const suggestions = ['متى أغير الزيت؟', 'ما سبب صوت الفرامل؟', 'كيف أوفر الوقود؟']

  const send = (text: string) => {
    if (!text.trim()) return
    setMsgs(m => [...m, { role: 'user', text }])
    setInput('')
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMsgs(m => [...m, { role: 'ai', text: 'بناءً على بيانات كامري 2021 المتصلة، هذا تحليل دقيق بناءً على القراءات الحية. هل تريد مساعدة إضافية؟' }])
    }, 1800)
  }

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, typing])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row' : 'row-reverse', gap: 8, alignItems: 'flex-end' }}>
            {m.role === 'ai' && (
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${C.orange}22`, border: `1px solid ${C.orangeBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>🤖</div>
            )}
            <div style={{
              maxWidth: '78%', background: m.role === 'user' ? C.surface : `${C.orange}12`,
              border: `1px solid ${m.role === 'user' ? C.border : `${C.orange}33`}`,
              borderRadius: 14, padding: '10px 14px',
              fontSize: 13, color: C.textSecondary, lineHeight: 1.7, fontFamily: 'Cairo', whiteSpace: 'pre-line'
            }}>{m.text}</div>
          </div>
        ))}
        {typing && (
          <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: `${C.orange}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🤖</div>
            <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '12px 16px', background: `${C.orange}12`, border: `1px solid ${C.orange}33`, borderRadius: 14 }}>
              {[0,1,2].map(i => <div key={i} className="blink-anim" style={{ width: 6, height: 6, borderRadius: '50%', background: C.orange, animationDelay: `${i*0.3}s` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div style={{ padding: '8px 12px', borderTop: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8, overflowX: 'auto' }}>
          {suggestions.map(s => (
            <button key={s} onClick={() => send(s)} style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: '4px 12px', color: C.textSecondary, fontSize: 11, fontFamily: 'Cairo', cursor: 'pointer', whiteSpace: 'nowrap' }}>{s}</button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send(input)} placeholder="اسأل عن سيارتك..." style={{ flex: 1, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: '11px 14px', color: '#fff', fontSize: 13, fontFamily: 'Cairo', outline: 'none', direction: 'rtl' }} />
          <button onClick={() => send(input)} style={{ width: 44, height: 44, background: C.orange, border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>↑</button>
        </div>
      </div>
    </div>
  )
}

// OBD Connect Screen
function OBDConnectScreen() {
  const [state, setState] = useState<'idle' | 'scanning' | 'found' | 'connected'>('idle')
  return (
    <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Connected device */}
      <div style={{ background: `${C.success}12`, border: `1px solid ${C.success}33`, borderRadius: 14, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.success, fontFamily: 'Cairo' }}>مفك Pro v2 — متصل</span>
          <Badge status="success" label="نشط" />
        </div>
        {[['البروتوكول', 'OBD-II / Bluetooth 5.0'], ['الإشارة', '🟢 ممتازة'], ['الفيرموير', 'v3.2.1'], ['المركبة', 'كامري 2021']].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid rgba(0,196,140,0.1)`, fontSize: 12 }}>
            <span style={{ color: C.textMuted, fontFamily: 'Cairo' }}>{k}</span>
            <span style={{ color: '#fff', fontFamily: 'Cairo' }}>{v}</span>
          </div>
        ))}
        <button style={{ width: '100%', background: `${C.error}18`, color: C.error, border: `1px solid ${C.error}33`, borderRadius: 10, padding: '10px', fontFamily: 'Cairo', fontSize: 13, fontWeight: 700, cursor: 'pointer', marginTop: 14 }}>فصل الجهاز</button>
      </div>

      {/* Add new */}
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 20 }}>
        <h3 style={{ fontFamily: 'Cairo', fontSize: 15, fontWeight: 700, color: '#fff', margin: '0 0 16px', textAlign: 'center' }}>ربط جهاز جديد</h3>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          {state === 'idle' && <div style={{ fontSize: 60, marginBottom: 14 }}>📡</div>}
          {state === 'scanning' && (
            <div style={{ width: 80, height: 80, borderRadius: '50%', border: `3px solid ${C.orange}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', animation: 'spin-slow 2s linear infinite' }}>
              <span style={{ fontSize: 28 }}>📡</span>
            </div>
          )}
          {state === 'found' && <div style={{ fontSize: 60, marginBottom: 14 }}>✅</div>}
          {state === 'connected' && <div style={{ fontSize: 60, marginBottom: 14 }}>🔌</div>}
          <p style={{ fontFamily: 'Cairo', fontSize: 13, color: C.textMuted, margin: 0 }}>
            {state === 'idle' && 'شبّك الجهاز بمقبس OBD-II ثم ابحث'}
            {state === 'scanning' && 'جاري البحث عبر Bluetooth...'}
            {state === 'found' && 'تم العثور على مفك Mini — MAC: B4:E6:2D'}
            {state === 'connected' && 'تم الربط بنجاح! 🎉'}
          </p>
        </div>
        {state === 'idle' && <button onClick={() => setState('scanning')} style={{ width: '100%', background: C.orange, color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>🔍 بدء البحث</button>}
        {state === 'scanning' && <button onClick={() => setState('found')} style={{ width: '100%', background: C.surface, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, cursor: 'pointer' }}>إيقاف البحث</button>}
        {state === 'found' && <button onClick={() => setState('connected')} style={{ width: '100%', background: C.success, color: '#000', border: 'none', borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>ربط الجهاز</button>}
        {state === 'connected' && <button onClick={() => setState('idle')} style={{ width: '100%', background: C.surface, color: C.textSecondary, border: `1px solid ${C.border}`, borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, cursor: 'pointer' }}>إغلاق</button>}
      </div>
    </div>
  )
}

// Alerts Mobile Screen
function AlertsMobileScreen() {
  const alerts = [
    { icon: '🔴', title: 'عطل P0171', desc: 'خلط هواء ووقود غير صحيح', time: 'ساعة', severity: 'error' as const, action: 'عرض' },
    { icon: '🔴', title: 'عطل P0420', desc: 'كفاءة المحول الحفاز منخفضة', time: '3 ساعات', severity: 'error' as const },
    { icon: '🟡', title: 'تغيير الزيت قريباً', desc: 'بعد 12 يوم أو 500 كم', time: 'أمس', severity: 'warning' as const, action: 'جدولة' },
    { icon: '🟡', title: 'ضغط إطار منخفض', desc: 'الأمامي الأيسر 29 PSI', time: 'يومان', severity: 'warning' as const },
    { icon: '🔵', title: 'مزامنة ناجحة', desc: 'تم تحديث بيانات الكامري', time: '5 أيام', severity: 'info' as const },
  ]
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {alerts.map((a, i) => <AlertItem key={i} {...a} />)}
    </div>
  )
}

// Profile Mobile Screen
function ProfileMobileScreen({ setScreen }: { setScreen: (s: MobileScreen) => void }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 24, textAlign: 'center', border: `1px solid ${C.border}` }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: C.orange, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, color: '#000', margin: '0 auto 14px' }}>أ</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>أحمد الغامدي</div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo', marginTop: 4 }}>ahmed@example.com · بلس</div>
        <div style={{ marginTop: 10 }}><Badge status="warning" label="باقة بلس" /></div>
      </div>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {[
          { icon: '🚗', label: 'مركباتي', count: '2', screen: 'vehicle' as MobileScreen },
          { icon: '💎', label: 'الاشتراك والباقات', screen: 'subscriptions' as MobileScreen },
          { icon: '🔌', label: 'أجهزة مفك', screen: 'obd-connect' as MobileScreen },
          { icon: '⚙️', label: 'الإعدادات', screen: 'settings' as MobileScreen },
        ].map((item, i) => (
          <button key={item.label} onClick={() => setScreen(item.screen)} style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px',
            background: 'none', border: 'none', borderBottom: i < 3 ? `1px solid ${C.border}` : 'none',
            cursor: 'pointer', textAlign: 'right'
          }}>
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span style={{ flex: 1, fontSize: 14, color: '#fff', fontFamily: 'Cairo' }}>{item.label}</span>
            {'count' in item && <span style={{ fontSize: 12, color: C.orange, fontFamily: 'Orbitron' }}>{item.count}</span>}
            <span style={{ color: C.textMuted, fontSize: 16 }}>←</span>
          </button>
        ))}
      </div>
      <button style={{ width: '100%', background: `${C.error}12`, border: `1px solid ${C.error}33`, borderRadius: 12, padding: '13px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, color: C.error, cursor: 'pointer' }}>تسجيل الخروج</button>
    </div>
  )
}

// Subscriptions Mobile Screen
function SubscriptionsMobileScreen({ back: _back }: { back: () => void }) {
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: `${C.orange}12`, border: `2px solid ${C.orange}`, borderRadius: 14, padding: 18 }}>
        <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginBottom: 4 }}>اشتراكك الحالي</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', fontFamily: 'Cairo' }}>باقة بلس</div>
        <div style={{ fontFamily: 'Orbitron', fontSize: 24, fontWeight: 700, color: C.orange, margin: '8px 0' }}>29 <span style={{ fontSize: 14 }}>ريال/شهر</span></div>
        <div style={{ fontSize: 12, color: C.textMuted, fontFamily: 'Cairo' }}>ينتهي في 26 يناير 2026</div>
      </div>
      {[
        { name: 'برو', price: '79', color: '#7c3aed', desc: 'للأساطيل والمحترفين', features: ['مركبات غير محدودة', 'تشخيص متقدم', 'إدارة الأساطيل', 'تقارير احترافية', 'مساعد AI متقدم'] },
      ].map(p => (
        <div key={p.name} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: 'Cairo' }}>{p.name}</div>
              <div style={{ fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', marginTop: 2 }}>{p.desc}</div>
            </div>
            <span style={{ fontFamily: 'Orbitron', fontSize: 22, fontWeight: 700, color: p.color }}>{p.price}<span style={{ fontSize: 11, color: C.textMuted }}> ريال</span></span>
          </div>
          {p.features.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, padding: '5px 0', fontSize: 13 }}>
              <span style={{ color: p.color }}>✓</span>
              <span style={{ color: C.textSecondary, fontFamily: 'Cairo' }}>{f}</span>
            </div>
          ))}
          <button style={{ width: '100%', background: p.color, color: '#fff', border: 'none', borderRadius: 10, padding: '12px', fontFamily: 'Cairo', fontSize: 14, fontWeight: 700, cursor: 'pointer', marginTop: 14 }}>ترقية للبرو</button>
        </div>
      ))}
    </div>
  )
}

// Settings Mobile Screen
function SettingsMobileScreen({ back: _back }: { back: () => void }) {
  const [notifs, setNotifs] = useState({ faults: true, maintenance: true, fuel: false })
  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${C.border}`, fontSize: 11, color: C.textMuted, fontFamily: 'Cairo', fontWeight: 700 }}>الإشعارات</div>
        {([['faults', 'تنبيهات الأعطال'], ['maintenance', 'تذكير الصيانة'], ['fuel', 'تنبيه انخفاض الوقود']] as const).map(([k, l]) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '13px 18px', borderBottom: `1px solid ${C.border}` }}>
            <span style={{ fontSize: 14, color: '#fff', fontFamily: 'Cairo' }}>{l}</span>
            <div onClick={() => setNotifs(n => ({ ...n, [k]: !n[k] }))} style={{ width: 44, height: 24, borderRadius: 12, background: notifs[k] ? C.orange : C.elevated, cursor: 'pointer', position: 'relative', transition: 'background 0.2s' }}>
              <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3, right: notifs[k] ? 3 : 23, transition: 'right 0.2s' }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        {[['اللغة', 'العربية'], ['وحدة المسافة', 'كيلومتر'], ['وحدة الحرارة', 'سيلسيوس'], ['الإصدار', '2.4.1']].map(([k, v], i, arr) => (
          <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: i < arr.length - 1 ? `1px solid ${C.border}` : 'none' }}>
            <span style={{ fontSize: 14, color: '#fff', fontFamily: 'Cairo' }}>{k}</span>
            <span style={{ fontSize: 13, color: C.orange, fontFamily: 'Cairo' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Mobile App Shell ─────────────────────────────────────────────────────────
export function MobileApp({ onSwitchWeb }: { onSwitchWeb: () => void }) {
  const [appState, setAppState] = useState<'splash' | 'onboarding' | 'auth' | 'main'>('splash')
  const [screen, setScreen] = useState<MobileScreen>('home')
  const [activeTab, setActiveTab] = useState<BottomTab>('home')

  const handleTabChange = (tab: BottomTab) => {
    setActiveTab(tab)
    const tabScreenMap: Record<BottomTab, MobileScreen> = { home: 'home', vehicle: 'vehicle', dtc: 'dtc', ai: 'ai', profile: 'profile' }
    setScreen(tabScreenMap[tab])
  }

  if (appState === 'splash') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
      <PhoneFrame screen="splash">
        <SplashScreen onDone={() => setAppState('onboarding')} />
      </PhoneFrame>
    </div>
  )

  if (appState === 'onboarding') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
      <PhoneFrame screen="onboarding">
        <OnboardingScreen onDone={() => setAppState('auth')} />
      </PhoneFrame>
    </div>
  )

  if (appState === 'auth') return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#000' }}>
      <PhoneFrame screen="login">
        <LoginScreen onLogin={() => setAppState('main')} />
      </PhoneFrame>
    </div>
  )

  // Determine if screen needs a back button
  const backScreens: MobileScreen[] = ['dtc-detail', 'add-maintenance', 'add-fuel', 'live-data', 'obd-connect', 'alerts', 'settings', 'subscriptions']
  const showBack = backScreens.includes(screen)

  const screenTitles: Partial<Record<MobileScreen, string>> = {
    home: 'مفك', vehicle: 'سيارتي', dtc: 'الأعطال', ai: 'المساعد الذكي', profile: 'حسابي',
    'live-data': 'بيانات مباشرة', 'dtc-detail': 'تفاصيل العطل',
    maintenance: 'الصيانة', 'add-maintenance': 'إضافة صيانة',
    fuel: 'سجل الوقود', 'add-fuel': 'تسجيل تعبئة',
    'obd-connect': 'جهاز مفك', alerts: 'التنبيهات',
    settings: 'الإعدادات', subscriptions: 'الاشتراكات',
  }

  const backScreen: Partial<Record<MobileScreen, MobileScreen>> = {
    'dtc-detail': 'dtc', 'add-maintenance': 'maintenance', 'add-fuel': 'fuel',
    'live-data': 'vehicle',
  }

  const showBottomNav = !showBack && !['live-data', 'dtc-detail', 'add-maintenance', 'add-fuel'].includes(screen)

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 0' }}>
      {/* Switch to website */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 1000 }}>
        <Btn variant="outline" size="sm" onClick={onSwitchWeb}>🌐 الموقع</Btn>
      </div>
      <PhoneFrame screen={screen}>
        {/* Top bar */}
        <TopBar
          title={screenTitles[screen] || 'مفك'}
          back={showBack ? () => setScreen(backScreen[screen] || 'home') : undefined}
          right={screen === 'home' ? undefined : undefined}
        />
        {/* Screen content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {screen === 'home' && <HomeScreen setScreen={s => { setScreen(s) }} />}
          {screen === 'vehicle' && <VehicleScreen setScreen={setScreen} />}
          {screen === 'live-data' && <LiveDataScreen />}
          {screen === 'dtc' && <DTCScreen setScreen={setScreen} />}
          {screen === 'dtc-detail' && <DTCDetailScreen back={() => setScreen('dtc')} />}
          {screen === 'maintenance' && <MaintenanceScreen setScreen={setScreen} />}
          {screen === 'add-maintenance' && <AddMaintenanceScreen back={() => setScreen('maintenance')} />}
          {screen === 'fuel' && <FuelScreen setScreen={setScreen} />}
          {screen === 'add-fuel' && <AddFuelScreen back={() => setScreen('fuel')} />}
          {screen === 'ai' && <AIScreen />}
          {screen === 'obd-connect' && <OBDConnectScreen />}
          {screen === 'alerts' && <AlertsMobileScreen />}
          {screen === 'profile' && <ProfileMobileScreen setScreen={setScreen} />}
          {screen === 'settings' && <SettingsMobileScreen back={() => setScreen('profile')} />}
          {screen === 'subscriptions' && <SubscriptionsMobileScreen back={() => setScreen('profile')} />}
        </div>
        {/* Bottom nav */}
        {showBottomNav && <BottomNav active={activeTab} onChange={handleTabChange} />}
      </PhoneFrame>
    </div>
  )
}
