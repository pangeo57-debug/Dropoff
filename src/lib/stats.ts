import type { AppData } from '../types'
import { EATING_OUT_CATEGORIES, TRANSPORT_CATEGORIES, findCategory } from '../constants'
import { addDays, weekdayIndex, WEEKDAYS_SHORT, money } from './dates'

export interface Summary {
  income: number
  expense: number
  net: number
  lostIncome: number
  cancelledCount: number
  doneCount: number
  byCategory: { name: string; value: number; color: string }[]
  byWeekday: { day: string; income: number; expense: number }[]
  byDay: { date: string; label: string; income: number; expense: number; cum: number }[]
}

export function summarize(data: AppData, from: string, to: string): Summary {
  const inRange = (d: string) => d >= from && d <= to
  const byCat = new Map<string, number>()
  const weekdays = WEEKDAYS_SHORT.map((day) => ({ day, income: 0, expense: 0 }))
  let income = 0
  let expense = 0
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
      w.income += t.amount
      if (day) day.income += t.amount
    } else {
      expense += t.amount
      w.expense += t.amount
      if (day) day.expense += t.amount
      byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount)
    }
  }

  const lessons = data.lessons.filter((l) => inRange(l.date))
  const cancelled = lessons.filter((l) => l.status === 'cancelled')

  return {
    income,
    expense,
    net: income - expense,
    lostIncome: cancelled.reduce((s, l) => s + l.fee, 0),
    cancelledCount: cancelled.length,
    doneCount: lessons.filter((l) => l.status === 'done').length,
    byCategory: [...byCat.entries()]
      .map(([name, value]) => ({ name, value, color: findCategory(name).color }))
      .sort((a, b) => b.value - a.value),
    byWeekday: weekdays,
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
