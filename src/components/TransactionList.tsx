import { Trash2, Zap } from 'lucide-react'
import type { Transaction } from '../types'
import { findCategory } from '../constants'
import { money } from '../lib/dates'

export function TransactionList({ items, onDelete, onEdit }: { items: Transaction[]; onDelete: (id: string) => void; onEdit: (t: Transaction) => void }) {
  const sorted = [...items].sort((a, b) => b.createdAt - a.createdAt)
  return (
    <section>
      <h2 className="mb-3 text-base font-semibold text-fg">Κινήσεις ημέρας</h2>
      {sorted.length === 0 && <p className="rounded-2xl border border-dashed border-fg/10 py-6 text-center text-sm text-slate-500">Καμία κίνηση</p>}
      <ul className="space-y-2">
        {sorted.map((t) => {
          const c = findCategory(t.category)
          const Icon = c.icon
          const inc = t.type === 'income'
          return (
            <li key={t.id} className="flex items-center gap-3 rounded-2xl bg-slate-800/70 p-3">
              <button disabled={!!t.lessonId} onClick={() => onEdit(t)} className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default">
                <span className="rounded-xl p-2" style={{ background: `${c.color}22`, color: c.color }}><Icon size={18} /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1 truncate text-sm font-medium text-fg">{c.label}{t.source === 'auto' && <Zap size={12} className="shrink-0 text-amber-400" aria-label="Αυτόματη καταγραφή" />}</span>
                  {t.note && <span className="block truncate text-xs text-slate-400">{t.note}</span>}
                </span>
                <span className={`font-semibold ${inc ? 'text-emerald-400' : 'text-rose-400'}`}>{inc ? '+' : '−'}{money(t.amount)}</span>
              </button>
              <button onClick={() => onDelete(t.id)} aria-label="Διαγραφή" className="rounded-full p-1.5 text-slate-500 active:scale-95"><Trash2 size={15} /></button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
