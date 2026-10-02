import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlertTriangle, ChevronLeft, ChevronRight, Info, Sparkles, TrendingUp } from 'lucide-react'
import type { AppData } from '../types'
import { PERIOD_LABELS, formatShort, money, parseISO, periodRange, addDays, type Period } from '../lib/dates'
import { buildInsights, summarize } from '../lib/stats'


export function Analytics({ data, anchor: initialAnchor, isLight }: { data: AppData; anchor: string; isLight: boolean }) {
  const tooltipStyle = isLight
    ? { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#0f172a' }
    : { background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#e2e8f0' }
  const grid = isLight ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.06)'
  const [period, setPeriod] = useState<Period>('week')
  const [anchor, setAnchor] = useState(initialAnchor)
  const { from, to } = periodRange(period, anchor)
  const s = useMemo(() => summarize(data, from, to), [data, from, to])
  const insights = useMemo(() => buildInsights(s), [s])

  const step = (dir: 1 | -1) => {
    // jump to the neighbouring period
    setAnchor(dir === 1 ? addDays(to, 1) : addDays(from, -1))
  }
  const label = from === to ? formatShort(from) : `${formatShort(from)} – ${formatShort(to)}`
  const monthLabel = parseISO(from).getFullYear()

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-4 gap-1 rounded-2xl bg-slate-800 p-1">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button key={p} onClick={() => setPeriod(p)} className={`rounded-xl py-2 text-xs font-medium transition ${p === period ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button onClick={() => step(-1)} aria-label="Προηγούμενη" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronLeft size={18} /></button>
        <p className="text-sm font-medium text-slate-200">{label} <span className="text-slate-500">{monthLabel}</span></p>
        <button onClick={() => step(1)} aria-label="Επόμενη" className="rounded-full bg-slate-800 p-2 active:scale-95"><ChevronRight size={18} /></button>
      </div>

      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg"><TrendingUp size={16} className="text-indigo-300" /> Οικονομικό ισοζύγιο</h3>
        <dl className="space-y-2 text-sm">
          <Row label="Μπήκαν" value={money(s.income)} cls="text-emerald-400" />
          <Row label="Βγήκαν" value={money(s.expense)} cls="text-rose-400" />
          <div className="my-1 border-t border-fg/10" />
          <Row label="Έμειναν (καθαρό)" value={money(s.net)} cls={s.net >= 0 ? 'text-fg font-bold' : 'text-rose-300 font-bold'} />
          <Row label={`Χαμένα από ακυρώσεις (${s.cancelledCount})`} value={money(s.lostIncome)} cls="text-amber-400" />
          <Row label="Ολοκληρωμένα μαθήματα" value={String(s.doneCount)} cls="text-slate-300" />
        </dl>
      </div>

      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">Έξοδα ανά κατηγορία</h3>
        {s.byCategory.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500">Δεν υπάρχουν έξοδα</p>
        ) : (
          <>
            <div className="h-52">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={s.byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2} stroke="none">
                    {s.byCategory.map((c) => <Cell key={c.name} fill={c.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="mt-2 space-y-1.5">
              {s.byCategory.map((c) => (
                <li key={c.name} className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                  <span className="flex-1 text-slate-300">{c.name}</span>
                  <span className="text-slate-400">{Math.round((c.value / s.expense) * 100)}%</span>
                  <span className="w-20 text-right font-medium text-fg">{money(c.value)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-2 text-sm font-semibold text-fg">Έσοδα vs Έξοδα ανά ημέρα εβδομάδας</h3>
        <div className="h-52">
          <ResponsiveContainer>
            <BarChart data={s.byWeekday} margin={{ left: -20, right: 4 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="day" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }} formatter={(v: number) => money(v)} />
              <Bar dataKey="income" name="Έσοδα" fill="#34d399" radius={[6, 6, 0, 0]} />
              <Bar dataKey="expense" name="Έξοδα" fill="#fb7185" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

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
  )
}

function Row({ label, value, cls }: { label: string; value: string; cls: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-slate-400">{label}</dt>
      <dd className={cls}>{value}</dd>
    </div>
  )
}
