import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { BarChart3, CalendarDays, LineChart, CalendarRange, ChevronLeft, SettingsIcon, ChevronRight, Minus, Plus } from 'lucide-react'
import { useAppData } from './store'
import { addDays, formatLong, periodRange, todayISO } from './lib/dates'
import { BalanceCard } from './components/BalanceCard'
import { Schedule } from './components/Schedule'
import { TransactionList } from './components/TransactionList'
import { TransactionSheet } from './components/TransactionSheet'
import { LessonSheet } from './components/LessonSheet'
import { useTheme } from './theme'
import { ackPayments, isConfigured, loadCfg, pullPayments } from './lib/cloud'
import { Settings } from './components/Settings'
import { RecurringSheet } from './components/RecurringSheet'
import { holidayName } from './lib/holidays'
import { Week } from './components/Week'
import { SlotSheet } from './components/SlotSheet'
import type { Lesson, RecurringTx, Transaction, TxType, WeeklySlot } from './types'

// recharts is heavy: load it only when the stats tab is opened
const Analytics = lazy(() => import('./components/Analytics').then((m) => ({ default: m.Analytics })))

const Overall = lazy(() => import('./components/Overall').then((m) => ({ default: m.Overall })))

type Tab = 'today' | 'week' | 'stats' | 'overall' | 'settings'

const TABS = [['today', 'Μέρα', CalendarDays], ['week', 'Εβδομάδα', CalendarRange], ['stats', 'Στατιστικά', BarChart3], ['overall', 'Συνολικά', LineChart], ['settings', 'Ρυθμίσεις', SettingsIcon]] as const

export default function App() {
  const { data, ready, storageError, addTransaction, deleteTransaction, saveLesson, setLessonStatus, deleteLesson, ensureRange, saveSlot, saveWeekAsProgramme, deleteSlot, ensureRecurring, saveRecurring, deleteRecurring, updateSettings, replaceData, updateTransaction, importInbox, importEntries } = useAppData()
  const theme = useTheme()
  const [tab, setTab] = useState<Tab>('today')
  const [date, setDate] = useState(todayISO())
  const [txSheet, setTxSheet] = useState<TxType | null>(null)
  const [lessonSheet, setLessonSheet] = useState<{ lesson?: Lesson } | null>(null)

  const [weekAnchor, setWeekAnchor] = useState(todayISO())
  const [editTx, setEditTx] = useState<Transaction | null>(null)
  const [recSheet, setRecSheet] = useState<{ item?: RecurringTx } | null>(null)
  const [slotSheet, setSlotSheet] = useState<{ slot?: WeeklySlot } | null>(null)

  // Generate lessons from the weekly programme for what's on screen
  const week = periodRange('week', weekAnchor)
  useEffect(() => {
    if (!ready) return
    ensureRange(date, date)
    ensureRange(week.from, week.to)
  }, [ready, date, week.from, week.to, data.weeklySlots, ensureRange])

  const [toast, setToast] = useState<string | null>(null)
  const importRef = useRef(importEntries)
  importRef.current = importEntries
  const syncing = useRef(false)

  // Pull payments the iPhone Shortcut dropped in the cloud mailbox (no-op until it's set up in Settings)
  const syncCloud = useCallback(async (): Promise<{ added: number; invalid?: number; error?: string }> => {
    if (storageError) return { added: 0, error: 'local-storage-unavailable' }
    const cfg = loadCfg()
    if (!isConfigured(cfg)) return { added: 0, error: 'not-configured' }
    if (syncing.current) return { added: 0 }
    syncing.current = true
    try {
      const { entries, invalid } = await pullPayments(cfg)
      const r = await importRef.current(entries)
      // Acknowledge only rows that parsed successfully and are now safely stored.
      const ackIds = entries.map((entry) => Number(entry.id.slice(3))).filter(Number.isFinite)
      await ackPayments(cfg, ackIds)
      if (r.added) setToast(`⚡ Καταγράφηκαν αυτόματα ${r.added} ${r.added === 1 ? 'πληρωμή' : 'πληρωμές'}`)
      if (invalid) setToast(`⚠ ${invalid} πληρωμές δεν διαβάστηκαν και έμειναν στη θυρίδα για έλεγχο.`)
      return { added: r.added, invalid }
    } catch (e) {
      return { added: 0, error: e instanceof Error ? e.message : 'error' }
    } finally {
      syncing.current = false
    }
  }, [storageError])

  useEffect(() => {
    if (!ready) return
    void syncCloud()
    const onVisible = () => document.visibilityState === 'visible' && void syncCloud()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(onVisible, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [ready, syncCloud])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 4000)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (ready) ensureRecurring()
  }, [ready, date, data.recurring, ensureRecurring])

  if (!ready) return null

  const holiday = (iso: string) => holidayName(iso, data.settings.region)

  const dayTx = data.transactions.filter((t) => t.date === date)
  const dayLessons = data.lessons.filter((l) => l.date === date)
  const income = dayTx.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expense = dayTx.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const active = dayLessons.filter((l) => l.status !== 'cancelled')
  const pending = active.filter((l) => l.status === 'scheduled').reduce((a, l) => a + l.fee, 0)
  const lastFee = [...data.lessons].sort((a, b) => b.date.localeCompare(a.date))[0]?.fee ?? 20

  return (
    <div className="mx-auto flex h-full max-w-lg flex-col bg-page lg:max-w-none lg:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col gap-1 border-r border-fg/10 bg-slate-900 p-4 lg:flex">
        <div className="mb-4 flex items-center gap-3 px-2 pt-2">
          <img src="./icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <span className="text-lg font-bold text-fg">Cash Flow</span>
        </div>
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${tab === id ? 'bg-indigo-500/15 text-indigo-400' : 'text-slate-400 hover:bg-fg/5'}`}>
            <Icon size={20} /> {label}
          </button>
        ))}
      </aside>
      <main className="flex-1 overflow-y-auto px-4 pb-44 safe-t lg:px-8 lg:pb-28">
        <div className="mx-auto w-full lg:max-w-5xl">
        {storageError && <div role="alert" className="mb-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">{storageError} Κάνε λήψη αντιγράφου ασφαλείας πριν κλείσεις την εφαρμογή.</div>}
        {tab === 'today' ? (
          <div className="space-y-6 lg:grid lg:grid-cols-2 lg:grid-rows-[auto_auto_1fr] lg:items-start lg:gap-x-8 lg:gap-y-6 lg:space-y-0">
            <header className="flex items-center justify-between lg:col-span-2">
              <button onClick={() => setDate(addDays(date, -1))} aria-label="Προηγούμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
              <button onClick={() => setDate(todayISO())} className="text-center">
                <p className="text-base font-semibold capitalize text-fg">{formatLong(date)}</p>
                {holiday(date) && <p className="text-xs font-medium text-amber-300">🎉 Αργία: {holiday(date)}</p>}
                {date !== todayISO() && <p className="text-xs text-indigo-300">Πάτα για σήμερα</p>}
              </button>
              <button onClick={() => setDate(addDays(date, 1))} aria-label="Επόμενη ημέρα" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
            </header>
            <div className="lg:col-start-1 lg:row-start-2">
  <BalanceCard income={income} expense={expense} lessonsDone={active.length - active.filter((l) => l.status === 'scheduled').length} lessonsTotal={active.length} pending={pending} />
            </div>
            <div className="lg:col-start-2 lg:row-span-2 lg:row-start-2">
  <Schedule lessons={dayLessons} onAdd={() => setLessonSheet({})} onEdit={(lesson) => setLessonSheet({ lesson })} onStatus={setLessonStatus} />
            </div>
            <div className="lg:col-start-1 lg:row-start-3">
  <TransactionList items={dayTx} onDelete={deleteTransaction} onEdit={setEditTx} />
            </div>
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
            onStatus={setLessonStatus}
          />
        ) : tab === 'overall' ? (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-fg">Συνολικά</h1>
            <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Φόρτωση…</p>}>
              <Overall data={data} isLight={theme.isLight} />
            </Suspense>
          </div>
        ) : tab === 'settings' ? (
          <Settings data={data} onSettings={updateSettings} onAdd={() => setRecSheet({})} onEdit={(item) => setRecSheet({ item })} onImport={replaceData} onImportInbox={importInbox} onSync={syncCloud} theme={theme.pref} onTheme={theme.choose} />
        ) : (
          <div className="space-y-4">
            <h1 className="text-xl font-bold text-fg">Στατιστικά</h1>
            <Suspense fallback={<p className="py-10 text-center text-sm text-slate-500">Φόρτωση…</p>}>
              <Analytics data={data} anchor={date} isLight={theme.isLight} />
            </Suspense>
          </div>
        )}
        </div>
      </main>

      {tab === 'today' && (
        <div className="fab-row pointer-events-none fixed inset-x-4 z-30 lg:inset-x-auto lg:bottom-8 lg:left-60 lg:right-8">
          <div className="mx-auto flex max-w-lg justify-between lg:max-w-5xl lg:justify-end lg:gap-3">
            <button onClick={() => setTxSheet('expense')} className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-rose-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-rose-950/40 active:scale-95">
              <Minus size={18} /> Έξοδο
            </button>
            <button onClick={() => setTxSheet('income')} className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-emerald-500 px-6 py-3.5 font-semibold text-white shadow-lg shadow-emerald-950/40 active:scale-95">
              <Plus size={18} /> Έσοδο
            </button>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-30 mx-auto grid max-w-lg grid-cols-5 border-t border-fg/10 bg-slate-950/95 safe-b lg:hidden">
        {TABS.map(([id, label, Icon]) => (
          <button key={id} onClick={() => setTab(id)} className={`flex flex-col items-center gap-0.5 pt-2.5 text-[11px] ${tab === id ? 'text-indigo-400' : 'text-slate-500'}`}>
            <Icon size={22} />
            {label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
          <div className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-fg shadow-lg ring-1 ring-fg/10">{toast}</div>
        </div>
      )}
      {editTx && (
        <TransactionSheet
          type={editTx.type}
          initial={{ category: editTx.category, amount: editTx.amount, note: editTx.note }}
          onClose={() => setEditTx(null)}
          onSave={(v) => { updateTransaction(editTx.id, v); setEditTx(null) }}
        />
      )}
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
