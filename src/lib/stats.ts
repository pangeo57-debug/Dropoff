import type { AppData } from '../types'
import { EATING_OUT_CATEGORIES, TRANSPORT_CATEGORIES, findCategory } from '../constants'
import { addDays, periodRange, toISO, weekdayIndex, WEEKDAYS_SHORT, money } from './dates'
import { holidayName } from './holidays'

export interface StudentStat {
  name: string
  done: number
  cancelled: number
  income: number
  lost: number
  avg: number
  cancelRate: number // 0-100
}

export interface TransportCost {
  total: number
  perLesson: number
  netPerLesson: number
  share: number // % of lesson income
  lessonIncome: number
}

export interface Summary {
  income: number
  expense: number
  incomeCount: number
  expenseCount: number
  net: number
  lostIncome: number
  cancelledCount: number
  doneCount: number
  byCategory: { name: string; value: number; color: string }[]
  byWeekday: { day: string; income: number; expense: number }[]
  byStudent: StudentStat[]
  transport: TransportCost
  byDay: { date: string; label: string; income: number; expense: number; cum: number }[]
}

export function summarize(data: AppData, from: string, to: string): Summary {
  const inRange = (d: string) => d >= from && d <= to
  const byCat = new Map<string, number>()
  const weekdays = WEEKDAYS_SHORT.map((day) => ({ day, income: 0, expense: 0 }))
  let income = 0
  let expense = 0
  let incomeCount = 0
  let expenseCount = 0
  const days = new Map<string, { date: string; label: string; income: number; expense: number; cum: number }>()
  for (let d = from, n = 0; d <= to && n < 62; d = addDays(d, 1), n++) {
    days.set(d, { date: d, label: from.slice(0, 7) === to.slice(0, 7) ? String(Number(d.slice(8))) : WEEKDAYS_SHORT[weekdayIndex(d)], income: 0, expense: 0, cum: 0 })
  }

  for (const t of data.transactions) {
    if (!inRange(t.date)) continue
    const w = weekdays[weekdayIndex(t.date)]
    const day = days.get(t.date)
    if (t.type === 'income') {
      income += t.amount
      incomeCount++
      w.income += t.amount
      if (day) day.income += t.amount
    } else {
      expense += t.amount
      expenseCount++
      w.expense += t.amount
      if (day) day.expense += t.amount
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    }
  }

  const lessons = data.lessons.filter((l) => inRange(l.date))
  const cancelled = lessons.filter((l) => l.status === 'cancelled')

  const students = new Map<string, StudentStat>()
  for (const l of lessons) {
    if (l.status === 'scheduled') continue
    const key = l.student.trim().toLowerCase()
    const st = students.get(key) ?? { name: l.student.trim(), done: 0, cancelled: 0, income: 0, lost: 0, avg: 0, cancelRate: 0 }
    if (l.status === 'done') { st.done++; st.income += l.fee } else { st.cancelled++; st.lost += l.fee }
    students.set(key, st)
  }
  const byStudent = [...students.values()]
    .map((st) => ({ ...st, avg: st.done ? st.income / st.done : 0, cancelRate: Math.round((st.cancelled / (st.done + st.cancelled)) * 100) }))
    .sort((a, b) => b.income - a.income || b.cancelled - a.cancelled)

  const doneLessons = lessons.filter((l) => l.status === 'done')
  const lessonIncome = doneLessons.reduce((a, l) => a + l.fee, 0)
  const transportTotal = [...byCat.entries()].filter(([c]) => TRANSPORT_CATEGORIES.includes(c)).reduce((a, [, v]) => a + v, 0)
  const transport: TransportCost = {
    total: transportTotal,
    perLesson: doneLessons.length ? transportTotal / doneLessons.length : 0,
    netPerLesson: doneLessons.length ? (lessonIncome - transportTotal) / doneLessons.length : 0,
    share: lessonIncome > 0 ? Math.round((transportTotal / lessonIncome) * 100) : 0,
    lessonIncome,
  }

  return {
    income,
    expense,
    incomeCount,
    expenseCount,
    net: income - expense,
    lostIncome: cancelled.reduce((s, l) => s + l.fee, 0),
    cancelledCount: cancelled.length,
    doneCount: lessons.filter((l) => l.status === 'done').length,
    byCategory: [...byCat.entries()]
      .map(([name, value]) => ({ name, value, color: findCategory(name).color }))
      .sort((a, b) => b.value - a.value),
    byWeekday: weekdays,
    byStudent,
    transport,
    byDay: (() => {
      let cum = 0
      return [...days.values()].map((d) => ({ ...d, cum: (cum += d.income - d.expense) }))
    })(),
  }
}

export interface Insight {
  tone: 'good' | 'warn' | 'info'
  text: string
}

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

export function buildInsights(s: Summary): Insight[] {
  const out: Insight[] = []
  if (s.income === 0 && s.expense === 0) return [{ tone: 'info', text: 'Δεν υπάρχουν κινήσεις στην περίοδο. Πρόσθεσε έσοδα/έξοδα για να δεις insights.' }]

  const top = s.byCategory[0]
  if (top) {
    out.push({
      tone: 'info',
      text: `Τα περισσότερα χρήματα πάνε σε «${top.name}»: ${money(top.value)} (${pct(top.value, s.expense)}% των εξόδων).`,
    })
  }

  const sum = (cats: string[]) => s.byCategory.filter((c) => cats.includes(c.name)).reduce((a, c) => a + c.value, 0)

  const transport = sum(TRANSPORT_CATEGORIES)
  if (transport > 0 && s.income > 0) {
    const p = pct(transport, s.income)
    out.push({
      tone: p >= 15 ? 'warn' : 'info',
      text: `Τα καύσιμα/διόδια/μετακινήσεις απορροφούν το ${p}% των εσόδων σου (${money(transport)}).${p >= 15 ? ' Δοκίμασε να ομαδοποιείς μαθήματα στην ίδια περιοχή.' : ''}`,
    })
  }

  const eating = sum(EATING_OUT_CATEGORIES)
  if (eating > 0 && s.income > 0 && pct(eating, s.income) >= 10) {
    out.push({ tone: 'warn', text: `Φαγητό και καφές κοστίζουν ${money(eating)} (${pct(eating, s.income)}% των εσόδων). Εδώ υπάρχει περιθώριο περικοπής.` })
  }

  const misc = sum(['Κουλουλού'])
  if (misc > 0 && pct(misc, s.expense) >= 15) {
    out.push({ tone: 'warn', text: `Τα «Κουλουλού» είναι το ${pct(misc, s.expense)}% των εξόδων. Δες αν κάποια ανήκουν σε συγκεκριμένη κατηγορία.` })
  }

  if (s.lostIncome > 0) {
    out.push({ tone: 'warn', text: `${s.cancelledCount} ακυρωμένα μαθήματα = ${money(s.lostIncome)} χαμένα έσοδα.` })
  }

  if (s.income > 0) {
    const rate = pct(s.net, s.income)
    out.push(
      s.net >= 0
        ? { tone: 'good', text: `Κρατάς το ${rate}% των εσόδων σου (${money(s.net)} καθαρό).` }
        : { tone: 'warn', text: `Τα έξοδα ξεπερνούν τα έσοδα κατά ${money(-s.net)}.` },
    )
  } else if (s.expense > 0) {
    out.push({ tone: 'warn', text: 'Έξοδα χωρίς έσοδα στην περίοδο.' })
  }

  return out
}

export interface Forecast {
  from: string
  to: string
  earned: number // income recorded in the month so far
  scheduled: number // lessons already in the calendar, not yet paid
  projected: number // weekly-programme lessons not yet generated
  recurring: number // recurring income still to come
  total: number
  isPast: boolean
  avgFee: number
}

export function monthForecast(data: AppData, anchor: string, today: string): Forecast {
  const { from, to } = periodRange('month', anchor)
  const earned = data.transactions.filter((t) => t.type === 'income' && t.date >= from && t.date <= to).reduce((a, t) => a + t.amount, 0)
  const doneFees = data.lessons.filter((l) => l.date >= from && l.date <= to && l.status === 'done').map((l) => l.fee)
  const slotFees = data.weeklySlots.map((x) => x.fee)
  const pool = doneFees.length ? doneFees : slotFees
  const avgFee = pool.length ? pool.reduce((a, b) => a + b, 0) / pool.length : 20
  const base = { from, to, earned, avgFee }
  if (to < today) return { ...base, scheduled: 0, projected: 0, recurring: 0, total: earned, isPast: true }

  const start = from > today ? from : today
  const scheduled = data.lessons.filter((l) => l.status === 'scheduled' && l.date >= start && l.date <= to).reduce((a, l) => a + l.fee, 0)

  const known = new Set(data.lessons.filter((l) => l.slotId).map((l) => `${l.slotId}|${l.date}`))
  data.skips.forEach((k) => known.add(k))
  let projected = 0
  for (let d = start; d <= to; d = addDays(d, 1)) {
    if (data.settings.skipHolidays && holidayName(d, data.settings.region)) continue
    for (const sl of data.weeklySlots) {
      if (sl.weekday === weekdayIndex(d) && d >= sl.startDate && !known.has(`${sl.id}|${d}`)) projected += sl.fee
    }
  }

  const [y, m] = [Number(from.slice(0, 4)), Number(from.slice(5, 7)) - 1]
  let recurring = 0
  for (const r of data.recurring) {
    if (r.type !== 'income') continue
    const date = toISO(new Date(y, m, Math.min(r.dayOfMonth, new Date(y, m + 1, 0).getDate())))
    const exists = data.transactions.some((t) => t.recurringId === r.id && t.date === date)
    if (date > today && date >= r.startDate && !exists) recurring += r.amount
  }
  return { ...base, scheduled, projected, recurring, total: earned + scheduled + projected + recurring, isPast: false }
}

export type RangeKey = '1W' | '1M' | '3M' | '6M' | '1Y' | 'ALL'
export const RANGES: { key: RangeKey; label: string; days: number | null }[] = [
  { key: '1W', label: '1Ε', days: 7 },
  { key: '1M', label: '1Μ', days: 30 },
  { key: '3M', label: '3Μ', days: 90 },
  { key: '6M', label: '6Μ', days: 182 },
  { key: '1Y', label: '1Χ', days: 365 },
  { key: 'ALL', label: 'Όλα', days: null },
]

export interface Overall {
  hasData: boolean
  series: { date: string; balance: number }[]
  startBalance: number
  total: number // cumulative net up to today
  income: number // within range
  expense: number
  bestDay?: { date: string; net: number }
  worstDay?: { date: string; net: number }
  avgPerActiveDay: number
  months: { label: string; income: number; expense: number; net: number }[]
  bestMonth?: { label: string; net: number }
}

/** Stock-style view: cumulative balance (all income minus all expenses) over time. */
export function overall(data: AppData, days: number | null, today: string): Overall {
  const txs = data.transactions.filter((t) => t.date <= today)
  if (txs.length === 0) return { hasData: false, series: [], startBalance: 0, total: 0, income: 0, expense: 0, avgPerActiveDay: 0, months: [] }

  const net = new Map<string, number>()
  const monthMap = new Map<string, { income: number; expense: number }>()
  let first = today
  for (const t of txs) {
    const v = t.type === 'income' ? t.amount : -t.amount
    net.set(t.date, (net.get(t.date) ?? 0) + v)
    if (t.date < first) first = t.date
    const mk = t.date.slice(0, 7)
    const m = monthMap.get(mk) ?? { income: 0, expense: 0 }
    if (t.type === 'income') m.income += t.amount
    else m.expense += t.amount
    monthMap.set(mk, m)
  }

  const start = days === null || addDays(today, -(days - 1)) < first ? first : addDays(today, -(days - 1))
  let startBalance = 0
  for (const [d, v] of net) if (d < start) startBalance += v

  const series: { date: string; balance: number }[] = []
  let bal = startBalance
  let income = 0
  let expense = 0
  const dayNets: { date: string; net: number }[] = []
  for (let d = start; d <= today; d = addDays(d, 1)) {
    const v = net.get(d) ?? 0
    bal += v
    series.push({ date: d, balance: Math.round(bal * 100) / 100 })
    if (net.has(d)) dayNets.push({ date: d, net: v })
  }
  for (const t of txs) {
    if (t.date < start) continue
    if (t.type === 'income') income += t.amount
    else expense += t.amount
  }

  const sorted = [...dayNets].sort((a, b) => b.net - a.net)
  const months = [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-12)
    .map(([k, m]) => ({
      label: new Date(Number(k.slice(0, 4)), Number(k.slice(5)) - 1, 1).toLocaleDateString('el-GR', { month: 'short', year: '2-digit' }),
      income: m.income,
      expense: m.expense,
      net: m.income - m.expense,
    }))
  const bestMonth = months.length ? [...months].sort((a, b) => b.net - a.net)[0] : undefined

  return {
    hasData: true,
    series,
    startBalance,
    total: bal,
    income,
    expense,
    bestDay: sorted[0],
    worstDay: sorted.length > 1 ? sorted[sorted.length - 1] : undefined,
    avgPerActiveDay: dayNets.length ? dayNets.reduce((a, d) => a + d.net, 0) / dayNets.length : 0,
    months,
    bestMonth: bestMonth && { label: bestMonth.label, net: bestMonth.net },
  }
}
