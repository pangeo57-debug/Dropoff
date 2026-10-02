import { useState } from 'react'
import { BarChart3, CalendarDays, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react'
import { useAppData } from './store'
import { addDays, formatLong, todayISO } from './lib/dates'
import { BalanceCard } from './components/BalanceCard'
import { Schedule } from './components/Schedule'
import { TransactionList } from './components/TransactionList'
import { TransactionSheet } from './components/TransactionSheet'
import { LessonSheet } from './components/LessonSheet'
import { Analytics } from './components/Analytics'
import type { Lesson, TxType } from './types'

type Tab = 'today' | 'stats'

export default function App() {
  const { data, ready, addTransaction, deleteTransaction, saveLesson, setLessonStatus, deleteLesson } = useAppData()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayISO())
  const [txSheet, setTxSheet] = useState<TxType | null>(null)
  const [lessonSheet, setLessonSheet] = useState<{ lesson?: Lesson } | null>(null)

  if (!ready) return null

  const dayTx = data.transactions.filter((t) => t.date === date)
  const dayLessons = data.lessons.filter((l) => l.date === date)
  const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const lastFee = [...data.lessons].sort((a, b) => b.date.localeCompare(a.date))[0]?.fee ?? 20

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-[#0b1020]">
      <main className="flex-1 overflow-y-auto px-4 pb-44 safe-t">
        {tab === 'today' ? (
          <div className="space-y-6">
            <header className="flex items-center justify-between">
              <button onClick={() => setDate(addDays(date, -1))} aria-label="Προηγούμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
              <button onClick={() => setDate(todayISO())} className="text-center">
                <p className="text-base font-semibold capitalize text-white">{formatLong(date)}</p>
                {date !== todayISO() && <p className="text-xs text-indigo-300">Πάτα για σήμερα</p>}
              </button>
              <button onClick={() => setDate(addDays(date, 1))} aria-label="Επόμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
            </header>
            <BalanceCard income={income} expense={expense} />
            <Schedule lessons={dayLessons} onAdd={() => setLessonSheet({})} onEdit={(lesson) => setLessonSheet({ lesson })} onStatus={setLessonStatus} />
            <TransactionList items={dayTx} onDelete={deleteTransaction} />
          </div>
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-white">Στατιστικά</h1>
            <Analytics data={data} anchor={date} />
          </div>
        )}
      </main>

      {tab === 'today' && (
        <div className="pointer-events-none fixed inset-x-0 bottom-[76px] z-30 mx-auto flex max-w-lg gap-3 px-4">
          <button onClick={() => setTxSheet('income')} className="pointer-events-auto flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-emerald-500 py-3.5 font-semibold text-white shadow-lg shadow-emerald-950/50 active:scale-95">
            <Plus size={18} /> Έσοδο
          </button>
          <button onClick={() => setTxSheet('expense')} className="pointer-events-auto flex flex-1 items-center justify-center gap-1.5 rounded-2xl bg-rose-500 py-3.5 font-semibold text-white shadow-lg shadow-rose-950/50 active:scale-95">
            <Minus size={18} /> Έξοδο
          </button>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-lg grid-cols-2 border-t border-white/10 bg-slate-950/90 backdrop-blur safe-b">
        {([['today', 'Σήμερα', CalendarDays], ['stats', 'Στατιστικά', BarChart3]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 pt-2.5 text-[11px] ${tab === id ? 'text-indigo-400' : 'text-slate-500'}`}>
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>

      {txSheet && (
        <TransactionSheet
          type={txSheet}
          onClose={() => setTxSheet(null)}
          onSave={(v) => {
            addTransaction({ type: txSheet, date, ...v })
            setTxSheet(null)
          }}
        />
      )}
      {lessonSheet && (
        <LessonSheet
          lesson={lessonSheet.lesson}
          date={date}
          defaultFee={lastFee}
          onClose={() => setLessonSheet(null)}
          onSave={(v) => {
            saveLesson(v)
            setLessonSheet(null)
          }}
          onDelete={lessonSheet.lesson ? () => { deleteLesson(lessonSheet.lesson!.id); setLessonSheet(null) } : undefined}
        />
      )}
    </div>
  )
}
