import { Check, ChevronLeft, ChevronRight, Pencil, Plus, Repeat } from 'lucide-react'
import type { Lesson, WeeklySlot } from '../types'
import { WEEKDAYS_SHORT, addDays, formatShort, money, periodRange, todayISO } from '../lib/dates'

interface Props {
  anchor: string
  setAnchor: (d: string) => void
  lessons: Lesson[]
  slots: WeeklySlot[]
  onOpenDay: (date: string) => void
  onAddSlot: () => void
  onEditSlot: (s: WeeklySlot) => void
  onSaveWeek: (from: string, to: string) => void
  holiday: (iso: string) => string | undefined
  onStatus: (id: string, s: Lesson['status']) => void
}

const dayTotal = (ls: Lesson[]) => ls.filter((l) => l.status !== 'cancelled').reduce((a, l) => a + l.fee, 0)

export function Week({ anchor, setAnchor, lessons, slots, onOpenDay, onAddSlot, onEditSlot, onSaveWeek, holiday, onStatus }: Props) {
  const { from, to } = periodRange('week', anchor)
  const today = todayISO()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const weekLessons = lessons.filter((l) => l.date >= from && l.date <= to && l.status !== 'cancelled')
  const oneOffs = lessons.filter((l) => l.date >= from && l.date <= to && !l.slotId && l.status !== 'cancelled').length
  const expected = weekLessons.reduce((s, l) => s + l.fee, 0)
  const paid = weekLessons.filter((l) => l.status === 'done').reduce((s, l) => s + l.fee, 0)

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <button onClick={() => setAnchor(addDays(from, -7))} aria-label="Προηγούμενη εβδομάδα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
        <button onClick={() => setAnchor(today)} className="text-center">
          <p className="text-base font-semibold text-fg">{formatShort(from)} – {formatShort(to)}</p>
          <p className="text-xs text-slate-400">{weekLessons.length} μαθήματα · {money(paid)} / {money(expected)}</p>
        </button>
        <button onClick={() => setAnchor(addDays(from, 7))} aria-label="Επόμενη εβδομάδα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
      </header>

      {expected > 0 && (
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full rounded-full bg-emerald-400 transition-all" style={{ width: `${Math.min(100, (paid / expected) * 100)}%` }} />
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">Εκκρεμούν {money(expected - paid)}</p>
        </div>
      )}

      <div className="space-y-2">
        {days.map((d, i) => {
          const ls = lessons.filter((l) => l.date === d).sort((a, b) => a.time.localeCompare(b.time))
          return (
            <div key={d} className={`flex gap-3 rounded-2xl border p-3 ${d === today ? 'border-indigo-400/50 bg-indigo-500/10' : 'border-white/5 bg-slate-800/60'}`}>
              <button onClick={() => onOpenDay(d)} aria-label="Άνοιγμα ημέρας" className="w-12 shrink-0 self-stretch rounded-xl text-center active:scale-95 active:bg-fg/5">
                <p className="text-xs text-slate-400">{WEEKDAYS_SHORT[i]}</p>
                <p className="text-lg font-bold text-fg">{Number(d.slice(8))}</p>
                {dayTotal(ls) > 0 && <p className="text-[10px] text-slate-400">{money(dayTotal(ls))}</p>}
              </button>
              <ul className="min-w-0 flex-1 space-y-1.5">
                {holiday(d) && <li className="text-xs font-medium text-amber-300">🎉 {holiday(d)}</li>}
                {ls.length === 0 && !holiday(d) && <li className="py-1 text-sm text-slate-600">—</li>}
                {ls.map((l) => (
                  <li key={l.id} className="flex items-center gap-2 text-sm">
                    <button
                      onClick={() => onStatus(l.id, l.status === 'done' ? 'scheduled' : 'done')}
                      disabled={l.status === 'cancelled'}
                      aria-label={l.status === 'done' ? 'Αναίρεση πληρωμής' : 'Ολοκλήρωση / Πληρώθηκε'}
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border active:scale-90 ${l.status === 'done' ? 'border-emerald-400 bg-emerald-500 text-white' : l.status === 'cancelled' ? 'border-rose-400/40 text-rose-400/60' : 'border-slate-500 text-transparent'}`}
                    >
                      <Check size={15} />
                    </button>
                    <button onClick={() => onOpenDay(d)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      <span className="text-indigo-300">{l.time}</span>
                      <span className={`truncate text-slate-100 ${l.status === 'cancelled' ? 'line-through opacity-60' : ''}`}>{l.student}</span>
                      {l.slotId && <Repeat size={11} className="shrink-0 text-slate-500" />}
                      <span className="ml-auto text-slate-400">{money(l.fee)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-semibold text-fg"><Repeat size={16} className="text-indigo-300" /> Πάγιο πρόγραμμα</h2>
          <button onClick={onAddSlot} className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1.5 text-sm text-indigo-300 active:scale-95"><Plus size={16} /> Πάγιο</button>
        </div>
        {oneOffs > 0 && (
          <button
            onClick={() => { if (window.confirm(`Να γίνουν πάγια (κάθε εβδομάδα) τα ${oneOffs} μαθήματα αυτής της εβδομάδας;`)) onSaveWeek(from, to) }}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3 text-sm font-semibold text-white active:scale-[.98]"
          >
            <Repeat size={16} /> Αποθήκευση αυτής της εβδομάδας ως πάγιο ({oneOffs})
          </button>
        )}
        {slots.length === 0 && <p className="rounded-2xl border border-dashed border-fg/10 py-6 text-center text-sm text-slate-500">Πρόσθεσε μαθήματα που γίνονται κάθε εβδομάδα και θα εμφανίζονται μόνα τους.</p>}
        <ul className="space-y-2">
          {[...slots].sort((a, b) => a.weekday - b.weekday || a.time.localeCompare(b.time)).map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-2xl bg-slate-800/70 p-3">
              <span className="w-9 text-center text-xs font-semibold text-indigo-300">{WEEKDAYS_SHORT[s.weekday]}</span>
              <span className="text-sm text-slate-300">{s.time}</span>
              <span className="flex-1 truncate text-sm font-medium text-fg">{s.student}</span>
              <span className="text-sm text-emerald-300">{money(s.fee)}</span>
              <button onClick={() => onEditSlot(s)} aria-label="Επεξεργασία" className="rounded-full bg-fg/5 p-1.5 text-slate-400 active:scale-95"><Pencil size={14} /></button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
