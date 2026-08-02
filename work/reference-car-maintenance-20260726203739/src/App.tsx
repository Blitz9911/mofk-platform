import { useState } from 'react'
import { Website } from './Website'
import { MobileApp } from './Mobile'

export default function App() {
  const [mode, setMode] = useState<'website' | 'mobile'>('website')
  return mode === 'website'
    ? <Website onSwitchMobile={() => setMode('mobile')} />
    : <MobileApp onSwitchWeb={() => setMode('website')} />
}
