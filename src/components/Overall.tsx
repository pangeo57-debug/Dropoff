import { useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Activity, TrendingDown, TrendingUp } from 'lucide-react'
import type { AppData } from '../types'
import { RANGES, cancelTrend, categoryTrend, overall, volatility, type RangeKey } from '../lib/stats'
import { formatShort, money, parseISO, todayISO } from '../lib/dates'

const fmtSigned = (n: number) => `${n >= 0 ? '+' : '−'}${money(Math.abs(n))}`

export function Overall({ data, isLight }: { data: AppData; isLight: boolean }) {
  const [range, setRange] = useState<RangeKey>('3M')
  const [hover, setHover] = useState<number | null>(null)
  const days = RANGES.find((r) => r.key === range)!.days
  const o = useMemo(() => overall(data, days, todayISO()), [data, days])
  const trend = useMemo(() => categoryTrend(data, todayISO()), [data])
  const cancels = useMemo(() => cancelTrend(data, todayISO()), [data])
  const vol = useMemo(() => volatility(data, todayISO()), [data])

  const grid = isLight ? 'rgba(15,23,42,.08)' : 'rgba(255,255,255,.06)'
  const tooltipStyle = isLight
    ? { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, color: '#0f172a' }
    : { background: '#0f172a', border: '1px solid rgba(255,255,255,.1)', borderRadius: 12, color: '#e2e8f0' }

  if (!o.hasData) {
    return <p className="rounded-2xl border border-dashed border-fg/10 py-10 text-center text-sm text-slate-500">Πρόσθεσε έσοδα ή έξοδα για να δεις το συνολικό διάγραμμα.</p>
  }

  const point = hover !== null ? o.series[hover] : o.series[o.series.length - 1]
  const change = point.balance - o.startBalance
  const pct = o.startBalance > 0 ? (change / o.startBalance) * 100 : null
  const up = change >= 0
  const color = up ? '#34d399' : '#fb7185'
  const long = days === null || days > 120
  const label = (d: string) => parseISO(d).toLocaleDateString('el-GR', long ? { month: 'short', year: '2-digit' } : { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-5">
      <div className="rounded-3xl bg-slate-800/70 p-4">
        <p className="text-xs text-slate-400">{hover !== null ? formatShort(point.date) : 'Συνολικό υπόλοιπο (έσοδα − έξοδα)'}</p>
        <p className="mt-0.5 text-4xl font-bold tracking-tight text-fg">{money(point.balance)}</p>
        <p className={`mt-1 flex items-center gap-1 text-sm font-semibold ${up ? 'text-emerald-400' : 'text-rose-400'}`}>
          {up ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
          {fmtSigned(change)}{pct !== null ? ` (${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%)` : ''}
          <span className="font-normal text-slate-400">· {RANGES.find((r) => r.key === range)!.label === 'Όλα' ? 'από την αρχή' : 'στην περίοδο'}</span>
        </p>

        <div className="mt-3 h-56 lg:h-72">
          <ResponsiveContainer>
            <AreaChart data={o.series} margin={{ left: 0, right: 4, top: 6 }} onMouseMove={(s) => setHover(typeof s?.activeTooltipIndex === 'number' ? s.activeTooltipIndex : null)} onMouseLeave={() => setHover(null)}>
              <defs>
                <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="date" tickFormatter={label} stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} minTickGap={48} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} width={44} domain={['auto', 'auto']} />
              <Tooltip content={() => null} cursor={{ stroke: color, strokeDasharray: '4 4' }} />
              <Area type="monotone" dataKey="balance" stroke={color} strokeWidth={2.5} fill="url(#fill)" dot={false} activeDot={{ r: 5, fill: color }} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 grid grid-cols-6 gap-1 rounded-2xl bg-slate-900 p-1">
          {RANGES.map((r) => (
            <button key={r.key} onClick={() => { setRange(r.key); setHover(null) }} className={`rounded-xl py-1.5 text-xs font-semibold ${r.key === range ? 'bg-indigo-500 text-white' : 'text-slate-400'}`}>{r.label}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Tile label="Έσοδα περιόδου" value={money(o.income)} cls="text-emerald-400" />
        <Tile label="Έξοδα περιόδου" value={money(o.expense)} cls="text-rose-400" />
        <Tile label="Καθαρό κέρδος" value={fmtSigned(o.income - o.expense)} cls={o.income - o.expense >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
        <Tile label="Μέσο / ημέρα με κινήσεις" value={fmtSigned(o.avgPerActiveDay)} cls="text-fg" />
        {o.bestDay && <Tile label="Καλύτερη ημέρα" value={fmtSigned(o.bestDay.net)} sub={formatShort(o.bestDay.date)} cls="text-emerald-400" />}
        {o.worstDay && <Tile label="Χειρότερη ημέρα" value={fmtSigned(o.worstDay.net)} sub={formatShort(o.worstDay.date)} cls="text-rose-400" />}
        {o.bestMonth && <Tile label="Καλύτερος μήνας" value={fmtSigned(o.bestMonth.net)} sub={o.bestMonth.label} cls="text-emerald-400" />}
        <Tile label="Σύνολο μέχρι σήμερα" value={money(o.total)} cls="text-fg" />
        {o.runwayDays !== null && <Tile label="Το υπόλοιπο φτάνει για" value={`~${o.runwayDays} ημέρες`} sub="με τον ρυθμό εξόδων 30 ημερών" cls={o.runwayDays < 14 ? 'text-rose-400' : 'text-fg'} />}
      </div>

      <div className="rounded-3xl bg-slate-800/70 p-4">
        <h3 className="mb-1 text-sm font-semibold text-fg">Μήνας προς μήνα</h3>
        <p className="mb-2 flex gap-3 text-[11px] text-slate-400">
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-emerald-400" />Έσοδα</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-rose-400" />Έξοδα</span>
          <span><i className="mr-1 inline-block h-2 w-2 rounded-full bg-indigo-400" />Καθαρό</span>
        </p>
        <div className="h-52">
          <ResponsiveContainer>
            <ComposedChart data={o.months} margin={{ left: -12, right: 4 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} cursor={{ fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }} />
              <Bar dataKey="income" name="Έσοδα" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Έξοδα" fill="#fb7185" radius={[4, 4, 0, 0]} />
              <Line dataKey="net" name="Καθαρό" stroke="#818cf8" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      {vol && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-fg"><Activity size={16} className="text-indigo-300" /> Διακύμανση εσόδων (εβδομάδα με εβδομάδα)</h3>
          <p className={`mb-3 text-sm font-semibold ${vol.level === 'stable' ? 'text-emerald-400' : vol.level === 'moderate' ? 'text-amber-400' : 'text-rose-400'}`}>
            {vol.level === 'stable' ? 'Σταθερά έσοδα' : vol.level === 'moderate' ? 'Μέτρια διακύμανση' : 'Ασταθή έσοδα'} · ±{vol.income.cv.toFixed(0)}%
          </p>
          <div className="h-40">
            <ResponsiveContainer>
              <BarChart data={vol.weeks} margin={{ left: -20, right: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} cursor={{ fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }} />
                <Bar dataKey="income" name="Έσοδα" fill="#34d399" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Έξοδα" fill="#fb7185" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Tile label="Μέσα έσοδα / εβδομάδα" value={money(vol.income.mean)} sub={`τυπική απόκλιση ${money(vol.income.sd)}`} cls="text-emerald-400" />
            <Tile label="Συνήθως τουλάχιστον" value={money(vol.income.safe)} sub="μέσος όρος − απόκλιση" cls="text-fg" />
            <Tile label="Χειρότερη / καλύτερη" value={`${money(vol.income.min)} – ${money(vol.income.max)}`} cls="text-fg" />
            <Tile label="Μέσα έξοδα / εβδομάδα" value={money(vol.expense.mean)} sub={`διακύμανση ±${vol.expense.cv.toFixed(0)}%`} cls="text-rose-400" />
          </div>
          <p className="mt-2 text-[11px] text-slate-500">Βασίζεται στις τελευταίες {vol.weeks.length} ολοκληρωμένες εβδομάδες. Όσο μικρότερο το ±%, τόσο πιο προβλέψιμα τα έσοδά σου.{vol.income.mean < vol.expense.mean ? '' : vol.level === 'volatile' ? ' Με ασταθή έσοδα βοηθά να κρατάς αποθεματικό 1–2 μηνών εξόδων.' : ''}</p>
        </div>
      )}

      {trend.cats.length > 0 && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-1 text-sm font-semibold text-fg">Τάση εξόδων ανά κατηγορία (6 μήνες)</h3>
          <p className="mb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
            {trend.cats.map((c) => <span key={c.name}><i className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: c.color }} />{c.name}</span>)}
          </p>
          <div className="h-52">
            <ResponsiveContainer>
              <BarChart data={trend.rows} margin={{ left: -12, right: 4 }}>
                <CartesianGrid stroke={grid} vertical={false} />
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => money(v)} cursor={{ fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }} />
                {trend.cats.map((c) => <Bar key={c.name} dataKey={c.name} stackId="a" fill={c.color} />)}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {cancels.some((c) => c.cancelled > 0) && (
        <div className="rounded-3xl bg-slate-800/70 p-4">
          <h3 className="mb-1 text-sm font-semibold text-fg">Ακυρώσεις ανά μήνα</h3>
          <p className="mb-2 text-[11px] text-slate-400">Χαμένα έσοδα: {money(cancels.reduce((a, c) => a + c.lost, 0))} τους τελευταίους 6 μήνες.</p>
          <div className="h-36">
            <ResponsiveContainer>
              <BarChart data={cancels} margin={{ left: -20, right: 4 }}>
                <XAxis dataKey="label" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: isLight ? 'rgba(15,23,42,.05)' : 'rgba(255,255,255,.04)' }} formatter={(v: number, n: string) => (n === 'Χαμένα €' ? money(v) : v)} />
                <Bar dataKey="done" name="Έγιναν" stackId="c" fill="#34d399" />
                <Bar dataKey="cancelled" name="Ακυρώθηκαν" stackId="c" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  )
}

function Tile({ label, value, sub, cls }: { label: string; value: string; sub?: string; cls: string }) {
  return (
    <div className="rounded-2xl bg-slate-800/70 p-3">
      <p className="text-[11px] text-slate-400">{label}</p>
      <p className={`mt-0.5 text-lg font-bold ${cls}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  )
}
