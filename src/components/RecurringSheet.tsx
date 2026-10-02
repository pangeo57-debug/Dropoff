import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { categoriesFor } from '../constants'
import { todayISO } from '../lib/dates'
import type { RecurringTx, TxType } from '../types'

interface Props {
  item?: RecurringTx
  onSave: (v: Omit<RecurringTx, 'id'> & { id?: string }) => void
  onDelete?: () => void
  onClose: () => void
}

export function RecurringSheet({ item, onSave, onDelete, onClose }: Props) {
  const [type, setType] = useState<TxType>(item?.type ?? 'income')
  const [category, setCategory] = useState(item?.category ?? 'Επίδομα')
  const [amount, setAmount] = useState(item ? String(item.amount) : '')
  const [note, setNote] = useState(item?.note ?? '')
  const [day, setDay] = useState(String(item?.dayOfMonth ?? 1))
  const [start, setStart] = useState(item?.startDate ?? todayISO())
  const cats = categoriesFor(type)
  const value = parseFloat(amount.replace(',', '.'))
  const dayNum = parseInt(day, 10)
  const valid = Number.isFinite(value) && value > 0 && dayNum >= 1 && dayNum <= 31 && start !== ''
  const field = 'w-full rounded-2xl bg-slate-800 px-4 py-3 outline-none ring-2 ring-transparent focus:ring-indigo-500 placeholder:text-slate-500'

  const switchType = (t: TxType) => {
    setType(t)
    setCategory(categoriesFor(t).find((c) => c.id === category)?.id ?? categoriesFor(t)[0].id)
  }

  return (
    <Sheet title={item ? 'Πάγια κίνηση' : 'Νέα πάγια κίνηση'} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-400">Καταγράφεται αυτόματα κάθε μήνα την ημέρα που ορίζεις.</p>
      <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-800 p-1">
        {(['income', 'expense'] as const).map((t) => (
          <button key={t} onClick={() => switchType(t)} className={`rounded-xl py-2 text-sm font-medium ${type === t ? (t === 'income' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white') : 'text-slate-400'}`}>
            {t === 'income' ? 'Έσοδο' : 'Έξοδο'}
          </button>
        ))}
      </div>
      <div className="relative mb-3">
        <input inputMode="decimal" placeholder="Ποσό" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-2">
        {cats.map((c) => {
          const Icon = c.icon
          return (
            <button key={c.id} onClick={() => setCategory(c.id)} className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center text-[11px] leading-tight active:scale-95 ${c.id === category ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/5 bg-slate-800 text-slate-300'}`}>
              <Icon size={20} style={{ color: c.color }} />
              {c.label}
            </button>
          )
        })}
      </div>
      <input placeholder="Περιγραφή (π.χ. ΔΥΠΑ)" value={note} onChange={(e) => setNote(e.target.value)} className={`${field} mb-3`} />
      <div className="mb-4 grid grid-cols-2 gap-3">
        <label className="text-xs text-slate-400">Ημέρα του μήνα
          <input inputMode="numeric" value={day} onChange={(e) => setDay(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="text-xs text-slate-400">Ξεκινά από
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className={`${field} mt-1`} />
        </label>
      </div>
      <button disabled={!valid} onClick={() => onSave({ id: item?.id, type, category, amount: Math.round(value * 100) / 100, note: note.trim(), dayOfMonth: dayNum, startDate: start })} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 font-semibold text-white active:scale-[.98] disabled:opacity-40">
        Αποθήκευση
      </button>
      {onDelete && (
        <button onClick={onDelete} className="mt-2 flex w-full items-center justify-center gap-2 py-2 text-sm text-rose-400">
          <Trash2 size={16} /> Διαγραφή (οι ήδη καταγεγραμμένες μένουν)
        </button>
      )}
    </Sheet>
  )
}
