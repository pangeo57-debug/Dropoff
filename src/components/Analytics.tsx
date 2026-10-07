import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Calculator, Clock, Gauge, Layers, PiggyBank, Trophy, Fuel, GraduationCap, Target, Users, ChevronLeft, ChevronRight, Info, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react'
import type { AppData } from '../types'
import { PERIOD_LABELS, addDays, formatShort, money, parseISO, periodRange, type Period } from '../lib/dates'
import { anomalies, budgetStatus, buildInsights, monthForecast, summarize } from '../lib/stats'
import { todayISO } from '../lib/dates'
import { findCategory } from '../constants'

export function Analytics({ data, anchor: initialAnchor, isLight }: { data: AppData; anchor: string; isLight: boolean }) {
  const tooltipStyle = isLight
    ? { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#0f172a' }
    : { background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#e2e8f0' }
  const grid = isLight ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.06)'
  const cursor = { fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }

  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(initialAnchor)
  const [cat, setCat] = useState<string | null>(null)
  const { from, to } = periodRange(period, anchor)
  const prevRange = periodRange(period, addDays(from, -1))
  const s = useMemo(() => summarize(data, from, to), [data, from, to])
  const prev = useMemo(() => summarize(data, prevRange.from, prevRange.to), [data, prevRange.from, prevRange.to])
  const forecast = useMemo(() => monthForecast(data, anchor, todayISO()), [data, anchor])
  const today = todayISO()
  // how the per-day average is divided is the user's choice
  const [avgMode, setAvgModeState] = useState<AvgMode>(() => {
    try {
      const v = localStorage.getItem('cashflow:avgMode')
      return v === 'full' || v === 'first' || v === 'active' ? v : 'elapsed'
    } catch {
      return 'elapsed'
    }
  })
  const setAvgMode = (m: AvgMode) => {
    setAvgModeState(m)
    try { localStorage.setItem('cashflow:avgMode', m) } catch { /* ignore */ }
  }
  const firstDate = useMemo(() => data.transactions.reduce((m, t) => (t.date < m ? t.date : m), '9999-12-31'), [data.transactions])
  const countDays = (r: { from: string; to: string }, sm: typeof s) => {
    const end = r.to < today ? r.to : today
    switch (avgMode) {
      case 'full': return daysBetween(r.from, r.to)
      case 'first': return Math.max(0, daysBetween(r.from > firstDate ? r.from : firstDate, end))
      case 'active': return sm.byDay.filter((d) => d.income > 0 || d.expense > 0).length
      default: return Math.max(0, daysBetween(r.from, end))
    }
  }
  // days that have actually elapsed in the period (a running month counts up to today)
  const elapsed = Math.max(0, daysBetween(from, to < today ? to : today))
  const days = countDays({ from, to }, s)
  const prevDays = countDays(prevRange, prev)
  const avgExp = days ? s.expense / days : 0
  const avgInc = days ? s.income / days : 0
  const prevAvgExp = prevDays ? prev.expense / prevDays : 0
  const prevAvgInc = prevDays ? prev.income / prevDays : 0
  const noSpendDays = s.byDay.filter((d) => d.date <= today && d.expense === 0).length
  const budget = useMemo(() => budgetStatus(data, anchor, today), [data, anchor, today])
  const unusual = useMemo(() => anomalies(data, period, from, to, today), [data, period, from, to, today])
  const insights = useMemo(() => buildInsights(s), [s])
  const catTx = useMemo(
    () => (cat ? data.transactions.filter((t) => t.type === 'expense' && t.category === cat && t.date >= from && t.date <= to).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt) : []),
    [cat, data.transactions, from, to],
  )

  const move = (dir: 1 | -1) => {
    setCat(null)
    setAnchor(dir === 1 ? addDays(to, 1) : addDays(from, -1))
  }
  const changePeriod = (p: Period) => {
    setCat(null)
    setPeriod(p)
  }
  const label = from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`
  const showDaily = from !== to
  const showWeekday = period === 'fortnight' || period === 'month'

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-800 p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} onClick={() => changePeriod(p)} className={`rounded-xl py-2 text-xs font-medium transition ${p === period ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => move(-1)} aria-label="Προηγούμενη" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
        <button onClick={() => { setCat(null); setAnchor(initialAnchor) }} className="text-sm font-medium text-slate-200">{label} <span className="text-slate-500">{parseISO(from).getFullYear()}</span></button>
        <button onClick={() => move(1)} aria-label="Επόμενη" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
      </div>

      <div className="masonry space-y-5 lg:space-y-0">
      <GoalCard f={forecast} goal={data.settings.monthlyGoal} />

      {budget.rows.length > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Gauge size={16} className="text-indigo-300" /> Όρια εξόδων · <span className="capitalize">{parseISO(budget.month).toLocaleDateString('el-GR', { month: 'long' })}</span></h3>
          <ul className="space-y-3">
            {budget.rows.map((r) => {
              const over = r.pct >= 100
              const warn = r.pct >= 80
              return (
                <li key={r.category}>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className="text-slate-200">{findCategory(r.category).label}</span>
                    <span className={over ? 'font-semibold text-rose-400' : 'text-slate-300'}>{money(r.spent)} <span className="text-slate-500">/ {money(r.limit)}</span></span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-700">
                    <div className={`h-full rounded-full ${over ? 'bg-rose-400' : warn ? 'bg-amber-400' : 'bg-emerald-400'}`} style={{ width: `${Math.min(100, r.pct)}%` }} />
                  </div>
                  <p className={`mt-0.5 text-[11px] ${over ? 'text-rose-400' : warn ? 'text-amber-400' : 'text-slate-500'}`}>
                    {over ? `Ξεπέρασες το όριο κατά ${money(r.spent - r.limit)}` : warn ? `Έμειναν ${money(r.limit - r.spent)}` : `${Math.round(r.pct)}%`}
                    {!over && r.projected > r.limit ? ` · με αυτόν τον ρυθμό θα φτάσεις ${money(r.projected)}` : ''}
                  </p>
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* balance with comparison to previous period */}
      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><TrendingUp size={16} className="text-indigo-300" /> Οικονομικό ισοζύγιο</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Μπήκαν" value={money(s.income)} cls="text-emerald-400" delta={delta(s.income, prev.income, true)} />
          <Row label="Βγήκαν" value={money(s.expense)} cls="text-rose-400" delta={delta(s.expense, prev.expense, false)} />
          <div className="my-1 border-t border-fg/10" />
          <Row label="Έμειναν (καθαρό)" value={money(s.net)} cls={s.net >= 0 ? 'text-fg font-bold' : 'text-rose-400 font-bold'} delta={delta(s.net, prev.net, true)} />
          <Row label={`Χαμένα από ακυρώσεις (${s.cancelledCount})`} value={money(s.lostIncome)} cls="text-amber-400" />
          <Row label="Ολοκληρωμένα μαθήματα" value={String(s.doneCount)} cls="text-slate-300" />
        </dl>
        <p className="mt-3 text-[11px] text-slate-500">Σύγκριση με {formatShort(prevRange.from)}{prevRange.from !== prevRange.to ? ` – ${formatShort(prevRange.to)}` : ''}</p>
      </div>

      {(s.incomeCount > 0 || s.expenseCount > 0) && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Calculator size={16} className="text-indigo-300" /> Μέσοι όροι</h3>
          <div className="mb-3 grid grid-cols-2 gap-1 rounded-2xl bg-slate-900 p-1 text-[11px] font-medium">
            {AVG_MODES.map(([id, label]) => (
              <button key={id} onClick={() => setAvgMode(id)} className={`rounded-xl px-2 py-1.5 ${avgMode === id ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>{label}</button>
            ))}
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-slate-400">
                <th className="pb-1.5 text-left font-normal" />
                <th className="pb-1.5 text-right font-medium text-emerald-400">Έσοδα</th>
                <th className="pb-1.5 text-right font-medium text-rose-400">Έξοδα</th>
              </tr>
            </thead>
            <tbody className="[&_td]:py-1.5 [&_tr]:border-t [&_tr]:border-fg/10">
              {days > 0 && (
                <MeanRow label="Ανά ημέρα" inc={avgInc} exp={avgExp} incDelta={delta(avgInc, prevAvgInc, true)} expDelta={delta(avgExp, prevAvgExp, false)} />
              )}
              {avgMode !== 'active' && days >= 7 && <MeanRow label="Ανά εβδομάδα" inc={avgInc * 7} exp={avgExp * 7} />}
              {avgMode !== 'active' && days >= 28 && <MeanRow label="Ανά μήνα (30 ημ.)" inc={avgInc * 30} exp={avgExp * 30} />}
              <MeanRow label="Ανά κίνηση" inc={s.incomeCount ? s.income / s.incomeCount : 0} exp={s.expenseCount ? s.expense / s.expenseCount : 0} sub={`${s.incomeCount} έσοδα · ${s.expenseCount} έξοδα`} />
            </tbody>
          </table>
          <p className="mt-2 text-[11px] text-slate-500">Ο μέσος ανά ημέρα διαιρείται με <b className="text-slate-300">{days} {days === 1 ? 'ημέρα' : 'ημέρες'}</b> ({AVG_MODES.find(([id]) => id === avgMode)![1].toLowerCase()}).</p>
          {showDaily && elapsed > 0 && <p className="mt-1 text-[11px] text-slate-400">Ημέρες χωρίς έξοδο: <b className="text-slate-200">{noSpendDays} από {elapsed}</b></p>}
        </div>
      )}

      {(unusual.length > 0 || s.topExpenses.length > 0) && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          {unusual.length > 0 && (
            <div className="mb-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><AlertTriangle size={16} className="text-amber-400" /> Ασυνήθιστα έξοδα</h3>
              <ul className="space-y-1.5 text-sm">
                {unusual.map((a) => (
                  <li key={a.category} className="flex justify-between gap-2">
                    <span className="text-slate-200">{findCategory(a.category).label}</span>
                    <span className="text-amber-400">{money(a.amount)} <span className="text-slate-500">(συνήθως ~{money(a.typical)} · ×{a.ratio.toFixed(1)})</span></span>
                  </li>
                ))}
              </ul>
              <p className="mt-1 text-[11px] text-slate-500">Σε σχέση με τον μέσο όρο των 3 προηγούμενων περιόδων.</p>
            </div>
          )}
          {s.topExpenses.length > 0 && (
            <>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Trophy size={16} className="text-indigo-300" /> Τα μεγαλύτερα έξοδα</h3>
              <ol className="space-y-1.5 text-sm">
                {s.topExpenses.map((t, i) => (
                  <li key={t.id} className="flex items-center gap-2">
                    <span className="w-4 text-slate-500">{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-slate-200">{findCategory(t.category).label}{t.note ? <span className="text-slate-500"> · {t.note}</span> : null}</span>
                    <span className="text-slate-500">{formatShort(t.date)}</span>
                    <span className="w-20 text-right font-semibold text-rose-400">−{money(t.amount)}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      )}

      {s.expense > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-fg"><Layers size={16} className="text-indigo-300" /> Πάγια vs ελεύθερα έξοδα</h3>
          <div className="flex h-3 overflow-hidden rounded-full bg-slate-700">
            <div className="bg-indigo-400" style={{ width: `${(s.fixedExpense / s.expense) * 100}%` }} />
            <div className="bg-rose-400" style={{ width: `${((s.expense - s.fixedExpense) / s.expense) * 100}%` }} />
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-slate-300"><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Πάγια {money(s.fixedExpense)} ({Math.round((s.fixedExpense / s.expense) * 100)}%)</span>
            <span className="text-slate-300"><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Ελεύθερα {money(s.expense - s.fixedExpense)}</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">Πάγια = Ρεύμα, Τα απαραίτητα και ό,τι έχεις ορίσει ως πάγια κίνηση.</p>
        </div>
      )}

      {s.incomeByCategory.length > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><PiggyBank size={16} className="text-indigo-300" /> Από πού έρχονται τα έσοδα</h3>
          <ul className="space-y-2.5">
            {s.incomeByCategory.map((c) => (
              <li key={c.name}>
                <div className="flex justify-between text-sm"><span className="text-slate-200">{findCategory(c.name).label}</span><span className="text-fg">{money(c.value)} <span className="text-slate-500">({Math.round((c.value / s.income) * 100)}%)</span></span></div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full rounded-full" style={{ width: `${(c.value / s.income) * 100}%`, background: c.color }} /></div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.lessonWeekday.some((d) => d.income > 0) && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg"><Clock size={16} className="text-indigo-300" /> Πιο προσοδοφόρες μέρες και ώρες</h3>
          <p className="mb-2 text-[11px] text-slate-500">Έσοδα από ολοκληρωμένα μαθήματα στην περίοδο.</p>
          <div className="h-36">
            <ResponsiveContainer>
              <BarChart data={s.lessonWeekday} margin={{ left: -20, right: 4 }}>
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursor} formatter={(v: number) => money(v)} />
                <Bar dataKey="income" name="Έσοδα" radius={[6, 6, 0, 0]}>
                  {s.lessonWeekday.map((d, i) => <Cell key={i} fill={d.income === Math.max(...s.lessonWeekday.map((x) => x.income)) ? '#34d399' : '#818cf8'} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {s.lessonHour.length > 1 && (
            <div className="mt-2 h-36">
              <ResponsiveContainer>
                <BarChart data={s.lessonHour} margin={{ left: -20, right: 4 }}>
                  <XAxis dataKey="hour" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={tooltipStyle} cursor={cursor} formatter={(v: number) => money(v)} />
                  <Bar dataKey="income" name="Έσοδα" radius={[6, 6, 0, 0]}>
                    {s.lessonHour.map((d, i) => <Cell key={i} fill={d.income === Math.max(...s.lessonHour.map((x) => x.income)) ? '#34d399' : '#818cf8'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {s.byStudent.length > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Users size={16} className="text-indigo-300" /> Ανά μαθητή</h3>
          <ul className="space-y-3">
            {s.byStudent.map((st) => (
              <li key={st.name}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium text-fg">{st.name}</span>
                  <span className="text-sm font-semibold text-emerald-400">{money(st.income)}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-700">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${(st.income / (s.byStudent[0].income || 1)) * 100}%` }} />
                </div>
                <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-400">
                  <span>{st.done} μαθ.</span>
                  {st.done > 0 && <span>μ.ο. {money(st.avg)}</span>}
                  {st.cancelled > 0 && <span className="text-amber-400">{st.cancelled} {st.cancelled === 1 ? 'ακύρωση' : 'ακυρώσεις'} ({st.cancelRate}%) · −{money(st.lost)}</span>}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {s.doneCount > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Fuel size={16} className="text-indigo-300" /> Απόδοση μαθημάτων</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Έσοδα / ώρα</p>
              <p className="text-lg font-bold text-emerald-400">{money(s.transport.incomePerHour)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Καθαρά / ώρα</p>
              <p className="text-lg font-bold text-emerald-400">{money(s.transport.netPerHour)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Μετακίνηση / μάθημα</p>
              <p className="text-lg font-bold text-rose-400">{money(s.transport.perLesson)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Καθαρό / μάθημα</p>
              <p className="text-lg font-bold text-emerald-400">{money(s.transport.netPerLesson)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">{s.doneCount} μαθήματα · {s.transport.hours.toFixed(1)} ώρες. Μετακίνηση = βενζίνη + διόδια + μετακινήσεις ({money(s.transport.total)}, {s.transport.share}% των εσόδων από μαθήματα). Μαθήματα χωρίς διάρκεια μετράνε 60 λεπτά.</p>
        </div>
      )}

      {showDaily && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-1 text-sm font-semibold text-fg">Ημέρα προς ημέρα</h3>
          <p className="mb-2 flex gap-3 text-[11px] text-slate-400">
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Έσοδα</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Έξοδα</span>
            <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Σωρευτικό καθαρό</span>
          </p>
          <div className="h-52">
            <ResponsiveContainer>
              <ComposedChart data={s.byDay} margin={{ left: -20, right: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursor} formatter={(v: number) => money(v)} labelFormatter={(_, p) => (p?.[0]?.payload?.date ? formatShort(p[0].payload.date) : '')} />
                <Bar dataKey="income" name="Έσοδα" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Έξοδα" fill="#fb7185" radius={[4, 4, 0, 0]} />
                <Line dataKey="cum" name="Σωρευτικό καθαρό" stroke="#818cf8" strokeWidth={2.5} dot={false} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-1 text-sm font-semibold text-fg">Έξοδα ανά κατηγορία</h3>
        {s.byCategory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Δεν υπάρχουν έξοδα</p>
        ) : (
          <>
            <p className="mb-1 text-[11px] text-slate-500">Πάτα μια κατηγορία για να δεις τις κινήσεις της.</p>
            <div className="relative h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={s.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none" onClick={(d) => setCat(cat === d.name ? null : d.name)}>
                    {s.byCategory.map((c) => <Cell key={c.name} fill={c.color} opacity={cat && cat !== c.name ? 0.25 : 1} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[11px] text-slate-400">{cat ?? 'Σύνολο'}</span>
                <span className="text-lg font-bold text-fg">{money(cat ? (s.byCategory.find((c) => c.name === cat)?.value ?? 0) : s.expense)}</span>
              </div>
            </div>
            <ul className="mt-2 space-y-1">
              {s.byCategory.map((c) => (
                <li key={c.name}>
                  <button onClick={() => setCat(cat === c.name ? null : c.name)} className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-sm active:scale-[.99] ${cat === c.name ? 'bg-indigo-500/15' : ''}`}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                    <span className="flex-1 text-left text-slate-300">{c.name}</span>
                    <span className="text-slate-400">{Math.round((c.value / s.expense) * 100)}%</span>
                    <span className="w-20 text-right font-medium text-fg">{money(c.value)}</span>
                  </button>
                </li>
              ))}
            </ul>

            {cat && (
              <div className="mt-3 rounded-2xl bg-slate-900 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg">{cat} · {catTx.length} κινήσεις</p>
                  <button onClick={() => setCat(null)} aria-label="Κλείσιμο" className="rounded-full bg-fg/10 p-1 text-slate-300"><X size={14} /></button>
                </div>
                <ul className="space-y-1.5 text-sm">
                  {catTx.map((t) => {
                    const Icon = findCategory(t.category).icon
                    return (
                      <li key={t.id} className="flex items-center gap-2">
                        <Icon size={14} className="shrink-0 text-slate-500" />
                        <span className="w-14 shrink-0 text-slate-400">{formatShort(t.date)}</span>
                        <span className="flex-1 truncate text-slate-300">{t.note || '—'}</span>
                        <span className="font-medium text-rose-400">−{money(t.amount)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>

      {showWeekday && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-2 text-sm font-semibold text-fg">Ποιες ημέρες της εβδομάδας βγάζεις / ξοδεύεις</h3>
          <div className="h-48">
            <ResponsiveContainer>
              <BarChart data={s.byWeekday} margin={{ left: -20, right: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={cursor} formatter={(v: number) => money(v)} />
                <Bar dataKey="income" name="Έσοδα" fill="#34d399" radius={[6, 6, 0, 0]} />
                <Bar dataKey="expense" name="Έξοδα" fill="#fb7185" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-br from-violet-600/15 to-indigo-600/10 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Sparkles size={16} className="text-violet-300" /> Smart Insights</h3>
        <ul className="space-y-2.5">
          {insights.map((i, idx) => (
            <li key={idx} className="flex gap-2.5 text-sm text-slate-200">
              {i.tone === 'warn' ? <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" /> : i.tone === 'good' ? <TrendingUp size={16} className="mt-0.5 shrink-0 text-emerald-400" /> : <Info size={16} className="mt-0.5 shrink-0 text-sky-400" />}
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      </div>
      </div>
    </div>
  )
}

type AvgMode = 'elapsed' | 'full' | 'first' | 'active'
const AVG_MODES: [AvgMode, string][] = [
  ['elapsed', 'Μέρες που πέρασαν'],
  ['full', 'Όλες οι μέρες'],
  ['first', 'Από 1η καταχώρηση'],
  ['active', 'Μέρες με κινήσεις'],
]

const daysBetween = (a: string, b: string) => Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / 86400000) + 1

interface Delta { text: string; good: boolean }

/** % change vs previous period; `upIsGood` flips colour for expenses. */
function delta(cur: number, prev: number, upIsGood: boolean): Delta | undefined {
  if (prev === 0 || cur === prev) return undefined
  const pct = Math.round(((cur - prev) / Math.abs(prev)) * 100)
  return { text: `${pct > 0 ? '+' : ''}${pct}%`, good: (pct > 0) === upIsGood }
}

function Row({ label, value, cls, delta }: { label: string; value: string; cls: string; delta?: Delta }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <dt className="text-slate-400">{label}</dt>
      <dd className="flex items-center gap-2">
        {delta && (
          <span className={`flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${delta.good ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {delta.good ? <TrendingUp size={10} /> : <TrendingDown size={10} />}{delta.text}
          </span>
        )}
        <span className={cls}>{value}</span>
      </dd>
    </div>
  )
}

function GoalCard({ f, goal }: { f: ReturnType<typeof monthForecast>; goal: number }) {
  const monthName = parseISO(f.from).toLocaleDateString('el-GR', { month: 'long' })
  const pct = goal > 0 ? Math.min(100, (f.earned / goal) * 100) : 0
  const missing = Math.max(0, goal - f.earned)
  const lessonsNeeded = Math.ceil(missing / (f.avgFee || 20))
  const reach = f.total >= goal
  return (
    <div className="rounded-3xl bg-slate-800/70 p-4">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Target size={16} className="text-indigo-300" /> <span className="capitalize">{monthName}: στόχος &amp; πρόβλεψη</span></h3>
      {goal > 0 ? (
        <>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-fg">{money(f.earned)} <span className="text-slate-400">από {money(goal)}</span></span>
            <span className="font-semibold text-indigo-300">{Math.round(pct)}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-700">
            <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-emerald-400' : 'bg-gradient-to-r from-indigo-500 to-violet-500'}`} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-300">
            {missing === 0 ? 'Ο στόχος επιτεύχθηκε 🎉' : <>Χρειάζεσαι ακόμα <b className="text-fg">{money(missing)}</b> (~{lessonsNeeded} μαθήματα).</>}
          </p>
        </>
      ) : (
        <p className="mb-2 text-sm text-slate-400">Έσοδα μήνα μέχρι τώρα: <b className="text-fg">{money(f.earned)}</b>. Όρισε στόχο στις Ρυθμίσεις για μπάρα προόδου.</p>
      )}
      {!f.isPast && (
        <div className="mt-3 rounded-2xl bg-slate-900 p-3 text-sm">
          <p className="mb-1.5 flex items-center gap-1.5 text-[11px] text-slate-400"><GraduationCap size={12} /> Πρόβλεψη τέλους μήνα</p>
          <p className="text-xl font-bold text-fg">{money(f.total)}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            Έχουν μπει {money(f.earned)} + προγραμματισμένα {money(f.scheduled)} + πάγιο πρόγραμμα {money(f.projected)}{f.recurring > 0 ? ` + πάγια έσοδα ${money(f.recurring)}` : ''}.
          </p>
          {goal > 0 && <p className={`mt-1 text-xs font-medium ${reach ? 'text-emerald-400' : 'text-amber-400'}`}>{reach ? 'Με αυτό το πρόγραμμα φτάνεις τον στόχο.' : `Λείπουν ${money(goal - f.total)} από τον στόχο.`}</p>}
        </div>
      )}
    </div>
  )
}

function MeanRow({ label, inc, exp, incDelta, expDelta, sub }: { label: string; inc: number; exp: number; incDelta?: Delta; expDelta?: Delta; sub?: string }) {
  const badge = (d?: Delta) => d && <span className={`ml-1 text-[10px] font-semibold ${d.good ? 'text-emerald-400' : 'text-rose-400'}`}>{d.text}</span>
  return (
    <tr>
      <td className="text-slate-300">{label}{sub && <span className="block text-[10px] text-slate-500">{sub}</span>}</td>
      <td className="text-right font-medium text-fg">{money(inc)}{badge(incDelta)}</td>
      <td className="text-right font-medium text-fg">{money(exp)}{badge(expDelta)}</td>
    </tr>
  )
}
