import { ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { money } from '../lib/dates'

interface Props {
  income: number
  expense: number
  lessonsDone: number
  lessonsTotal: number // not counting cancelled
  pending: number // fees of lessons still waiting to be paid
}

export function BalanceCard({ income, expense, lessonsDone, lessonsTotal, pending }: Props) {
  const net = income - expense
  return (
    <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 p-5 shadow-xl shadow-indigo-950/50">
      <p className="text-sm text-indigo-100/80">Καθαρό υπόλοιπο ημέρας</p>
      <p className={`mt-1 text-4xl font-bold tracking-tight ${net < 0 ? 'text-[#fecdd3]' : 'text-white'}`}>{money(net)}</p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-black/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#6ee7b7]"><ArrowUpCircle size={14} /> Έσοδα</div>
          <p className="mt-1 text-lg font-semibold text-[#6ee7b7]">{money(income)}</p>
        </div>
        <div className="rounded-2xl bg-black/20 p-3">
          <div className="flex items-center gap-1.5 text-xs text-[#fda4af]"><ArrowDownCircle size={14} /> Έξοδα</div>
          <p className="mt-1 text-lg font-semibold text-[#fda4af]">{money(expense)}</p>
        </div>
      </div>
      {lessonsTotal > 0 && (
        <div className="mt-3">
          <div className="mb-1 flex justify-between text-xs text-indigo-100/80">
            <span>Μαθήματα {lessonsDone}/{lessonsTotal}</span>
            <span>{pending > 0 ? `Εκκρεμούν ${money(pending)}` : 'Όλα πληρώθηκαν ✓'}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/25">
            <div className="h-full rounded-full bg-[#6ee7b7] transition-all" style={{ width: `${(lessonsDone / lessonsTotal) * 100}%` }} />
          </div>
        </div>
      )}
    </div>
  )
}
