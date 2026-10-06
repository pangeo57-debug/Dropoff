import type { TxType } from '../types'

export interface InboxEntry {
  id: string // the raw line: used to skip lines that were already imported
  date: string
  amount: number
  type: TxType
  merchant: string
}

/** "12,50 €", "1.234,56", "-8.9", "EUR 5" → positive number, NaN if unreadable. */
export function parseAmount(raw: string): number {
  let s = raw.replace(/[^\d.,-]/g, '')
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    const decimal = lastComma > lastDot ? ',' : '.'
    s = s.split(decimal === ',' ? '.' : ',').join('').replace(',', '.')
  } else if (lastComma >= 0) {
    s = /,\d{1,2}$/.test(s) ? s.replace(',', '.') : s.replace(/,/g, '')
  }
  return Math.abs(parseFloat(s))
}

const toDate = (dt: string): string | undefined => {
  const iso = dt.match(/^(\d{4}-\d{2}-\d{2})/)?.[1]
  const dmy = dt.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})/)
  return iso ?? (dmy ? `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}` : undefined)
}

export function makeEntry(id: string, dt: string, amt: string, merchant: string, flag = ''): InboxEntry | null {
  const date = toDate(dt)
  const amount = parseAmount(amt)
  if (!date || !Number.isFinite(amount) || amount <= 0) return null
  return { id, date, amount: Math.round(amount * 100) / 100, type: /^(in|income|έσοδο)$/i.test(flag) ? 'income' : 'expense', merchant }
}

/**
 * One payment per line:  2026-10-06T14:03:22+03:00 | 12,50 € | ΕΚΟ ΠΑΤΡΑ [| in]
 * (date | amount | merchant | optional "in" for income). Lines starting with # are ignored.
 */
export function parseInbox(text: string): { entries: InboxEntry[]; invalid: number } {
  const entries: InboxEntry[] = []
  let invalid = 0
  for (const line of text.split(/\r?\n/)) {
    const l = line.trim()
    if (!l || l.startsWith('#')) continue
    const [dt = '', amt = '', merchant = '', flag = ''] = l.split('|').map((p) => p.trim())
    const e = makeEntry(l, dt, amt, merchant, flag)
    if (e) entries.push(e)
    else invalid++
  }
  return { entries, invalid }
}
