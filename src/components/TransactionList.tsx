import { Trash2 } from 'lucide-react'
import type { Transaction } from '../types'
import { findCategory } from '../constants'
import { money } from '../lib/dates'

export function TransactionList({ items, onDelete }: { items: Transaction[]; onDelete: (id: string) => void }) {
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt)
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-white">Κινήσεις ημέρας</h2>
      {sorted.length === 0 && <p className="rounded-2xl border border-dashed border-white/10 py-6 text-center text-sm text-slate-500">Καμία κίνηση</p>}
      <ul className="space-y-2">
        {sorted.map((t) => {
          const c = findCategory(t.category)
          const Icon = c.icon
          const inc = t.type === 'income'
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-slate-800/70 p-3">
              <span className="rounded-xl p-2" style={{ background: `${c.color}22`, color: c.color }}><Icon size={18} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{c.label}</p>
                {t.note && <p className="truncate text-xs text-slate-400">{t.note}</p>}
              </div>
              <span className={`font-semibold ${inc ? 'text-emerald-400' : 'text-rose-400'}`}>{inc ? '+' : '−'}{money(t.amount)}</span>
              <button onClick={() => onDelete(t.id)} aria-label="Διαγραφή" className="rounded-full p-1.5 text-slate-500 active:scale-95"><Trash2 size={15} /></button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
