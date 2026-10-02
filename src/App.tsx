import { Suspense, lazy, useEffect, useState } from 'react'
import { BarChart3, CalendarDays, CalendarRange, ChevronLeft, SettingsIcon, ChevronRight, Minus, Plus } from 'lucide-react'
import { useAppData } from './store'
import { addDays, formatLong, periodRange, todayISO } from './lib/dates'
import { BalanceCard } from './components/BalanceCard'
import { Schedule } from './components/Schedule'
import { TransactionList } from './components/TransactionList'
import { TransactionSheet } from './components/TransactionSheet'
import { LessonSheet } from './components/LessonSheet'
import { useTheme } from './theme'
import { Settings } from './components/Settings'
import { RecurringSheet } from './components/RecurringSheet'
import { holidayName } from './lib/holidays'
import { Week } from './components/Week'
import { SlotSheet } from './components/SlotSheet'
import type { Lesson, RecurringTx, TxType, WeeklySlot } from './types'

// recharts is heavy: load it only when the stats tab is opened
const Analytics = lazy(() => import('./components/Analytics').then((m) => ({ default: m.Analytics })))

type Tab = 'today' | 'week' | 'stats' | 'settings'

export default function App() {
  const { data, ready, addTransaction, deleteTransaction, saveLesson, setLessonStatus, deleteLesson, ensureRange, saveSlot, saveWeekAsProgramme, deleteSlot, ensureRecurring, saveRecurring, deleteRecurring, updateSettings, replaceData } = useAppData()
  const theme = useTheme()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayISO())
  const [txSheet, setTxSheet] = useState<TxType | null>(null)
  const [lessonSheet, setLessonSheet] = useState<{ lesson?: Lesson } | null>(null)

  const [weekAnchor, setWeekAnchor] = useState(todayISO())
  const [recSheet, setRecSheet] = useState<{ item?: RecurringTx } | null>(null)
  const [slotSheet, setSlotSheet] = useState<{ slot?: WeeklySlot } | null>(null)

  // Generate lessons from the weekly programme for what's on screen
  const week = periodRange('week', weekAnchor)
  useEffect(() => {
    if (!ready) return
    ensureRange(date, date)
    ensureRange(week.from, week.to)
  }, [ready, date, week.from, week.to, data.weeklySlots, ensureRange])

  useEffect(() => {
    if (ready) ensureRecurring()
  }, [ready, date, data.recurring, ensureRecurring])

  if (!ready) return null

  const holiday = (iso: string) => holidayName(iso, data.settings.region)

  const dayTx = data.transactions.filter((t) => t.date === date)
  const dayLessons = data.lessons.filter((l) => l.date === date)
  const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const lastFee = [...data.lessons].sort((a, b) => b.date.localeCompare(a.date))[0]?.fee ?? 20

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-page">
      <main className="flex-1 overflow-y-auto px-4 pb-44 safe-t">
        {tab === 'today' ? (
          <div className="space-y-6">
            <header className="flex items-center justify-between">
              <button onClick={() => setDate(addDays(date, -1))} aria-label="Προηγούμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
              <button onClick={() => setDate(todayISO())} className="text-center">
                <p className="text-base font-semibold capitalize text-fg">{formatLong(date)}</p>
                {holiday(date) && <p className="text-xs font-medium text-amber-300">🎉 Αργία: {holiday(date)}</p>}
                {date !== todayISO() && <p className="text-xs text-indigo-300">Πάτα για σήμερα</p>}
              </button>
              <button onClick={() => setDate(addDays(date, 1))} aria-label="Επόμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
            </header>
            <BalanceCard income={income} expense={expense} />
            <Schedule lessons={dayLessons} onAdd={() => setLessonSheet({})} onEdit={(lesson) => setLessonSheet({ lesson })} onStatus={setLessonStatus} />
            <TransactionList items={dayTx} onDelete={deleteTransaction} />
          </div>
        ) : tab === 'week' ? (
          <Week
            anchor={weekAnchor}
            setAnchor={setWeekAnchor}
            lessons={data.lessons}
            slots={data.weeklySlots}
            onOpenDay={(d) => { setDate(d); setTab('today') }}
            onAddSlot={() => setSlotSheet({})}
            onEditSlot={(slot) => setSlotSheet({ slot })}
            onSaveWeek={saveWeekAsProgramme}
            holiday={holiday}
          />
        ) : tab === 'settings' ? (
          <Settings data={data} onSettings={updateSettings} onAdd={() => setRecSheet({})} onEdit={(item) => setRecSheet({ item })} onImport={replaceData} theme={theme.pref} onTheme={theme.choose} />
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-fg">Στατιστικά</h1>
            <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Φόρτωση…</p>}>
              <Analytics data={data} anchor={date} isLight={theme.isLight} />
            </Suspense>
          </div>
        )}
      </main>

      {tab === 'today' && (
        <>
          <button onClick={() => setTxSheet('expense')} className="fab-row fixed left-4 z-30 flex items-center gap-1.5 rounded-full bg-rose-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-rose-950/40 active:scale-95">
            <Minus size={18} /> Έξοδο
          </button>
          <button onClick={() => setTxSheet('income')} className="fab-row fixed right-4 z-30 flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-950/40 active:scale-95">
            <Plus size={18} /> Έσοδο
          </button>
        </>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-lg grid-cols-4 border-t border-fg/10 bg-slate-950/95 safe-b">
        {([['today', 'Μέρα', CalendarDays], ['week', 'Εβδομάδα', CalendarRange], ['stats', 'Στατιστικά', BarChart3], ['settings', 'Ρυθμίσεις', SettingsIcon]] as const).map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 pt-2.5 text-[11px] ${tab === id ? 'text-indigo-400' : 'text-slate-500'}`}>
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>

      {recSheet && (
        <RecurringSheet
          item={recSheet.item}
          onClose={() => setRecSheet(null)}
          onSave={(v) => { saveRecurring(v); setRecSheet(null) }}
          onDelete={recSheet.item ? () => { deleteRecurring(recSheet.item!.id); setRecSheet(null) } : undefined}
        />
      )}
      {slotSheet && (
        <SlotSheet
          slot={slotSheet.slot}
          weekday={(new Date(weekAnchor + 'T00:00').getDay() + 6) % 7}
          defaultFee={lastFee}
          onClose={() => setSlotSheet(null)}
          onSave={(v) => { saveSlot(v); setSlotSheet(null) }}
          onDelete={slotSheet.slot ? () => { deleteSlot(slotSheet.slot!.id); setSlotSheet(null) } : undefined}
        />
      )}
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
