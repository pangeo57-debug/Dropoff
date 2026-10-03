import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, Fuel, GraduationCap, Target, Users, ChevronLeft, ChevronRight, Info, Sparkles, TrendingDown, TrendingUp, X } from 'lucide-react'
import type { AppData } from '../types'
import { PERIOD_LABELS, addDays, formatShort, money, parseISO, periodRange, type Period } from '../lib/dates'
import { buildInsights, monthForecast, summarize } from '../lib/stats'
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

      {s.transport.total > 0 && s.doneCount > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><Fuel size={16} className="text-indigo-300" /> Κόστος ανά μάθημα</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Μετακίνηση / μάθημα</p>
              <p className="text-lg font-bold text-rose-400">{money(s.transport.perLesson)}</p>
            </div>
            <div className="rounded-2xl bg-slate-900 p-3">
              <p className="text-[11px] text-slate-400">Καθαρό / μάθημα</p>
              <p className="text-lg font-bold text-emerald-400">{money(s.transport.netPerLesson)}</p>
            </div>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">Βενζίνη + διόδια + μετακινήσεις: {money(s.transport.total)} σε {s.doneCount} μαθήματα, δηλαδή {s.transport.share}% των εσόδων από μαθήματα.</p>
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
