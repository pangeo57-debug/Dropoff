import { useState } from 'react'
import { CalendarHeart, Palette, ClipboardPaste, Copy, Download, Pencil, Plus, Repeat } from 'lucide-react'
import type { ThemePref } from '../theme'
import { normalize } from '../storage/repository'
import type { AppData, RecurringTx, Settings as SettingsT } from '../types'
import { REGIONS, holidaysFor } from '../lib/holidays'
import { findCategory } from '../constants'
import { formatShort, money, parseISO, todayISO } from '../lib/dates'

interface Props {
  data: AppData
  onSettings: (p: Partial<SettingsT>) => void
  onAdd: () => void
  onEdit: (r: RecurringTx) => void
  onImport: (d: AppData) => void
  theme: ThemePref
  onTheme: (t: ThemePref) => void
}

function Backup({ data, onImport }: { data: AppData; onImport: (d: AppData) => void }) {
  const [text, setText] = useState('')
  const [msg, setMsg] = useState('')
  const json = JSON.stringify(data)
  const btn = 'flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2.5 text-sm text-slate-100 active:scale-95'

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setMsg('Αντιγράφηκε! Επικόλλησέ το κάπου ασφαλές (π.χ. Σημειώσεις).')
    } catch {
      setMsg('Η αντιγραφή δεν επιτράπηκε. Χρησιμοποίησε «Λήψη αρχείου».')
    }
  }
  const download = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    a.download = `cashflow-backup-${todayISO()}.json`
    a.click()
  }
  const restore = () => {
    try {
      const parsed = JSON.parse(text.trim())
      if (typeof parsed !== 'object' || parsed === null || !('transactions' in parsed || 'lessons' in parsed)) throw new Error()
      if (!window.confirm('Τα τρέχοντα δεδομένα θα αντικατασταθούν. Συνέχεια;')) return
      onImport(normalize(parsed))
      setText('')
      setMsg('Η επαναφορά ολοκληρώθηκε.')
    } catch {
      setMsg('Δεν αναγνωρίστηκαν δεδομένα. Επικόλλησε ολόκληρο το αντίγραφο.')
    }
  }

  return (
    <section className="space-y-3 rounded-3xl bg-slate-800/70 p-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-fg"><Download size={16} className="text-indigo-300" /> Αντίγραφο ασφαλείας</h2>
      <p className="text-xs text-slate-400">Τα δεδομένα μένουν μόνο σε αυτή τη συσκευή. Κάνε αντίγραφο πριν σβήσεις την εφαρμογή.</p>
      <div className="flex gap-2">
        <button onClick={copy} className={btn}><Copy size={15} /> Αντιγραφή</button>
        <button onClick={download} className={btn}><Download size={15} /> Λήψη αρχείου</button>
      </div>
      <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="Επικόλλησε εδώ το αντίγραφο για επαναφορά…" rows={3} className="w-full rounded-2xl bg-slate-900 px-3 py-2 text-base text-slate-200 outline-none placeholder:text-slate-500" />
      <button disabled={!text.trim()} onClick={restore} className={`${btn} w-full flex-none disabled:opacity-40`}><ClipboardPaste size={15} /> Επαναφορά</button>
      {msg && <p className="text-xs text-indigo-300">{msg}</p>}
    </section>
  )
}

export function Settings({ data, onSettings, onAdd, onEdit, onImport, theme, onTheme }: Props) {
  const { region, skipHolidays } = data.settings
  const today = todayISO()
  const upcoming = [...holidaysFor(Number(today.slice(0, 4)), region), ...holidaysFor(Number(today.slice(0, 4)) + 1, region)]
    .filter(([d]) => d >= today)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(0, 6)

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-fg">Ρυθμίσεις</h1>

      <section className="space-y-3 rounded-3xl bg-slate-800/70 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg"><Palette size={16} className="text-indigo-300" /> Εμφάνιση</h2>
        <div className="grid grid-cols-3 gap-1 rounded-2xl bg-slate-900 p-1">
          {([['system', 'Συστήματος'], ['light', 'Φωτεινό'], ['dark', 'Σκοτεινό']] as const).map(([id, label]) => (
            <button key={id} onClick={() => onTheme(id)} className={`rounded-xl py-2 text-sm font-medium ${theme === id ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>{label}</button>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-slate-800/70 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-fg"><CalendarHeart size={16} className="text-indigo-300" /> Αργίες</h2>
        <label className="block text-xs text-slate-400">Περιοχή
          <select value={region} onChange={(e) => onSettings({ region: e.target.value })} className="mt-1 w-full rounded-2xl bg-slate-900 px-4 py-3 text-base text-fg outline-none">
            {REGIONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
        <label className="flex items-center justify-between gap-3 text-sm text-slate-200">
          Να μην δημιουργούνται πάγια μαθήματα τις αργίες
          <input type="checkbox" checked={skipHolidays} onChange={(e) => onSettings({ skipHolidays: e.target.checked })} className="h-5 w-5 accent-indigo-500" />
        </label>
        <div>
          <p className="mb-1.5 text-xs text-slate-400">Επόμενες αργίες</p>
          <ul className="space-y-1 text-sm">
            {upcoming.map(([d, name]) => (
              <li key={d} className="flex justify-between"><span className="text-slate-200">{name}</span><span className="text-slate-400">{parseISO(d).toLocaleDateString('el-GR', { weekday: 'short', day: 'numeric', month: 'short' })}</span></li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-slate-500">Οι τοπικές αργίες είναι ενδεικτικές, επιβεβαίωσέ τις με τον δήμο σου.</p>
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg"><Repeat size={16} className="text-indigo-300" /> Πάγια έσοδα / έξοδα</h2>
          <button onClick={onAdd} className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1.5 text-sm text-indigo-300 active:scale-95"><Plus size={16} /> Νέο</button>
        </div>
        {data.recurring.length === 0 && <p className="rounded-2xl border border-dashed border-fg/10 py-6 text-center text-sm text-slate-500">π.χ. Ταμείο ανεργίας κάθε μήνα, ενοίκιο, λογαριασμοί.</p>}
        <ul className="space-y-2">
          {data.recurring.map((r) => {
            const c = findCategory(r.category)
            const Icon = c.icon
            const inc = r.type === 'income'
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl bg-slate-800/70 p-3">
                <span className="rounded-xl p-2" style={{ background: `${c.color}22`, color: c.color }}><Icon size={18} /></span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-fg">{r.note || c.label}</p>
                  <p className="text-xs text-slate-400">κάθε {r.dayOfMonth} του μήνα · από {formatShort(r.startDate)}</p>
                </div>
                <span className={`font-semibold ${inc ? 'text-emerald-400' : 'text-rose-400'}`}>{inc ? '+' : '−'}{money(r.amount)}</span>
                <button onClick={() => onEdit(r)} aria-label="Επεξεργασία" className="rounded-full bg-fg/5 p-1.5 text-slate-400 active:scale-95"><Pencil size={14} /></button>
              </li>
            )
          })}
        </ul>
      </section>
      <Backup data={data} onImport={onImport} />
    </div>
  )
}
