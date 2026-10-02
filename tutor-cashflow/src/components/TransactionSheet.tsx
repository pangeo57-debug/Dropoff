import { useState } from 'react'
import { Sheet } from './Sheet'
import { categoriesFor } from '../constants'
import type { TxType } from '../types'

interface Props {
  type: TxType
  onSave: (v: { category: string; amount: number; note: string }) => void
  onClose: () => void
}

export function TransactionSheet({ type, onSave, onClose }: Props) {
  const cats = categoriesFor(type)
  const [category, setCategory] = useState(cats[0].id)
  const [amount, setAmount] = useState('')
  const [note, setNote] = useState('')
  const isIncome = type === 'income'
  const value = parseFloat(amount.replace(',', '.'))
  const valid = Number.isFinite(value) && value > 0

  return (
    <Sheet title={isIncome ? 'Νέο έσοδο' : 'Νέο έξοδο'} onClose={onClose}>
      <div className="relative mb-4">
        <input
          autoFocus
          inputMode="decimal"
          placeholder="0,00"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className={`w-full rounded-2xl bg-slate-800 px-4 py-4 pr-12 text-4xl font-bold outline-none ring-2 ring-transparent focus:ring-indigo-500 ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}
        />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-2xl text-slate-500">€</span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2">
        {cats.map((c) => {
          const active = c.id === category
          const Icon = c.icon
          return (
            <button
              key={c.id}
              onClick={() => setCategory(c.id)}
              className={`flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-center text-[11px] leading-tight transition active:scale-95 ${
                active ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-white/5 bg-slate-800 text-slate-300'
              }`}
            >
              <Icon size={20} style={{ color: c.color }} />
              {c.label}
            </button>
          )
        })}
      </div>

      <input
        placeholder="Περιγραφή (προαιρετικά)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="mb-4 w-full rounded-2xl bg-slate-800 px-4 py-3 outline-none ring-2 ring-transparent placeholder:text-slate-500 focus:ring-indigo-500"
      />

      <button
        disabled={!valid}
        onClick={() => onSave({ category, amount: Math.round(value * 100) / 100, note: note.trim() })}
        className={`w-full rounded-2xl py-3.5 text-base font-semibold text-white transition active:scale-[.98] disabled:opacity-40 ${isIncome ? 'bg-emerald-500' : 'bg-rose-500'}`}
      >
        Αποθήκευση
      </button>
    </Sheet>
  )
}
