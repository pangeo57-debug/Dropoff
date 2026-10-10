import { useEffect, useState } from 'react'
import { Delete, Lock, ScanFace } from 'lucide-react'
import { loadLock, resetEverything, unlockBio, verifyPin } from '../lib/lock'

export function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const cfg = loadLock()
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)
  const [fails, setFails] = useState(0)
  const [waitUntil, setWaitUntil] = useState(0)
  const [, tick] = useState(0)
  const len = cfg?.length ?? 4
  const waiting = Date.now() < waitUntil

  useEffect(() => {
    if (!waiting) return
    const t = setInterval(() => tick((n) => n + 1), 500)
    return () => clearInterval(t)
  }, [waiting])

  const add = async (d: string) => {
    if (waiting || pin.length >= len) return
    const next = pin + d
    setPin(next)
    setError(false)
    if (next.length === len) {
      if (await verifyPin(next)) {
        onUnlock()
        return
      }
      const f = fails + 1
      setFails(f)
      setError(true)
      if (f % 5 === 0) setWaitUntil(Date.now() + 30000)
      setTimeout(() => setPin(''), 400)
    }
  }

  const bio = async () => {
    if (await unlockBio()) onUnlock()
  }

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-page px-6">
      <Lock size={30} className="mb-3 text-indigo-300" />
      <h1 className="mb-1 text-xl font-bold text-fg">Cash Flow</h1>
      <p className="mb-6 text-sm text-slate-400">{waiting ? `Πολλές αποτυχίες. Περίμενε ${Math.ceil((waitUntil - Date.now()) / 1000)}″` : 'Βάλε τον κωδικό σου'}</p>
      <div className={`mb-8 flex gap-3 ${error ? 'animate-pulse' : ''}`}>
        {Array.from({ length: len }, (_, i) => (
          <span key={i} className={`h-3.5 w-3.5 rounded-full border ${i < pin.length ? (error ? 'border-rose-400 bg-rose-400' : 'border-indigo-400 bg-indigo-400') : 'border-slate-500'}`} />
        ))}
      </div>
      <div className="grid w-64 grid-cols-3 gap-3">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} onClick={() => void add(d)} className="aspect-square rounded-full bg-slate-800 text-2xl font-medium text-fg active:scale-95">{d}</button>
        ))}
        {cfg?.bio ? (
          <button onClick={() => void bio()} aria-label="Face ID" className="flex aspect-square items-center justify-center rounded-full text-indigo-300 active:scale-95"><ScanFace size={28} /></button>
        ) : <span />}
        <button onClick={() => void add('0')} className="aspect-square rounded-full bg-slate-800 text-2xl font-medium text-fg active:scale-95">0</button>
        <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Διαγραφή" className="flex aspect-square items-center justify-center rounded-full text-slate-400 active:scale-95"><Delete size={24} /></button>
      </div>
      <button
        onClick={() => { if (window.confirm('Ξέχασες τον κωδικό; Θα διαγραφούν τα δεδομένα αυτής της συσκευής (όχι όσα έχεις στο cloud με συγχρονισμό). Συνέχεια;')) resetEverything() }}
        className="mt-8 text-xs text-slate-500 underline"
      >
        Ξέχασα τον κωδικό
      </button>
    </div>
  )
}
