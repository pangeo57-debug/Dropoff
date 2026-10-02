import { Ban, CheckCircle2, Pencil, Plus, RotateCcw } from 'lucide-react'
import type { Lesson } from '../types'
import { money } from '../lib/dates'

interface Props {
  lessons: Lesson[]
  onAdd: () => void
  onEdit: (l: Lesson) => void
  onStatus: (id: string, s: Lesson['status']) => void
}

export function Schedule({ lessons, onAdd, onEdit, onStatus }: Props) {
  const sorted = [...lessons].sort((a, b) => a.time.localeCompare(b.time))
  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-white">Πρόγραμμα</h2>
        <button onClick={onAdd} className="flex items-center gap-1 rounded-full bg-indigo-500/20 px-3 py-1.5 text-sm text-indigo-300 active:scale-95">
          <Plus size={16} /> Έξτρα μάθημα
        </button>
      </div>

      {sorted.length === 0 && (
        <p className="rounded-2xl border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">Κανένα μάθημα σήμερα</p>
      )}

      <ol className="relative space-y-3 border-l border-white/10 pl-4">
        {sorted.map((l) => {
          const done = l.status === 'done'
          const cancelled = l.status === 'cancelled'
          return (
            <li key={l.id} className="relative">
              <span className={`absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-400' : cancelled ? 'bg-rose-400' : 'bg-indigo-400'}`} />
              <div className={`rounded-2xl border p-3.5 ${done ? 'border-emerald-500/30 bg-emerald-500/10' : cancelled ? 'border-rose-500/20 bg-slate-800/40 opacity-70' : 'border-white/5 bg-slate-800/70'}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-indigo-300">{l.time}</p>
                    <p className={`truncate font-semibold text-white ${cancelled ? 'line-through' : ''}`}>{l.student}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-300">{money(l.fee)}</span>
                    <button onClick={() => onEdit(l)} aria-label="Επεξεργασία" className="rounded-full bg-white/5 p-1.5 text-slate-400 active:scale-95">
                      <Pencil size={14} />
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex gap-2">
                  {l.status === 'scheduled' ? (
                    <>
                      <button onClick={() => onStatus(l.id, 'done')} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-emerald-500 py-2 text-sm font-semibold text-white active:scale-95">
                        <CheckCircle2 size={16} /> Ολοκλήρωση / Πληρώθηκε
                      </button>
                      <button onClick={() => onStatus(l.id, 'cancelled')} className="flex items-center gap-1 rounded-xl bg-slate-700 px-3 py-2 text-sm text-rose-300 active:scale-95">
                        <Ban size={16} /> Ακύρωση
                      </button>
                    </>
                  ) : (
                    <button onClick={() => onStatus(l.id, 'scheduled')} className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2 text-sm text-slate-200 active:scale-95">
                      <RotateCcw size={14} /> {done ? 'Αναίρεση πληρωμής' : 'Επαναφορά'}
                    </button>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
