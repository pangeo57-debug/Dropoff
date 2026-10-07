import type { AppData } from '../types'
import { findCategory } from '../constants'

// Excel in Greek locale expects ';' as separator and ',' as decimal mark; the BOM keeps the Greek letters intact.
const num = (n: number) => n.toFixed(2).replace('.', ',')
const cell = (v: string) => `"${v.replace(/"/g, '""')}"`

function download(name: string, rows: string[][]) {
  const csv = '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n')
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 5000)
}

export function exportTransactions(data: AppData) {
  const rows = [['Ημερομηνία', 'Τύπος', 'Κατηγορία', 'Ποσό', 'Περιγραφή', 'Αυτόματη']]
  for (const t of [...data.transactions].sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt)) {
    rows.push([t.date, t.type === 'income' ? 'Έσοδο' : 'Έξοδο', findCategory(t.category).label, num(t.amount), t.note, t.source === 'auto' ? 'ναι' : ''])
  }
  download('cashflow-kiniseis.csv', rows)
}

export function exportMonthly(data: AppData) {
  const m = new Map<string, { i: number; e: number }>()
  for (const t of data.transactions) {
    const k = t.date.slice(0, 7)
    const v = m.get(k) ?? { i: 0, e: 0 }
    if (t.type === 'income') v.i += t.amount
    else v.e += t.amount
    m.set(k, v)
  }
  const rows = [['Μήνας', 'Έσοδα', 'Έξοδα', 'Καθαρό']]
  for (const [k, v] of [...m.entries()].sort(([a], [b]) => a.localeCompare(b))) rows.push([k, num(v.i), num(v.e), num(v.i - v.e)])
  download('cashflow-minaia-synopsi.csv', rows)
}
