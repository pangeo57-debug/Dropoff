export const toISO = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export const parseISO = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISO(new Date())

export const addDays = (iso: string, n: number): string => {
  const d = parseISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

// Monday-based weekday index: Mon=0 … Sun=6
export const weekdayIndex = (iso: string): number => (parseISO(iso).getDay() + 6) % 7

export const WEEKDAYS_SHORT = ['Δευ', 'Τρι', 'Τετ', 'Πεμ', 'Παρ', 'Σαβ', 'Κυρ']

export type Period = 'day' | 'week' | 'fortnight' | 'month'

export const PERIOD_LABELS: Record<Period, string> = {
  day: 'Ημέρα',
  week: 'Εβδομάδα',
  fortnight: '15ήμερο',
  month: 'Μήνας',
}

export function periodRange(period: Period, anchor: string): { from: string; to: string } {
  const d = parseISO(anchor)
  switch (period) {
    case 'day':
      return { from: anchor, to: anchor }
    case 'week': {
      const from = addDays(anchor, -weekdayIndex(anchor))
      return { from, to: addDays(from, 6) }
    }
    case 'fortnight': {
      const y = d.getFullYear()
      const m = d.getMonth()
      return d.getDate() <= 15
        ? { from: toISO(new Date(y, m, 1)), to: toISO(new Date(y, m, 15)) }
        : { from: toISO(new Date(y, m, 16)), to: toISO(new Date(y, m + 1, 0)) }
    }
    case 'month':
      return { from: toISO(new Date(d.getFullYear(), d.getMonth(), 1)), to: toISO(new Date(d.getFullYear(), d.getMonth() + 1, 0)) }
  }
}

export const formatLong = (iso: string) =>
  parseISO(iso).toLocaleDateString('el-GR', { weekday: 'long', day: 'numeric', month: 'long' })

export const formatShort = (iso: string) =>
  parseISO(iso).toLocaleDateString('el-GR', { day: 'numeric', month: 'short' })

const eur = new Intl.NumberFormat('el-GR', { style: 'currency', currency: 'EUR' })
export const money = (n: number) => eur.format(n)
