import { emptyData, type AppData, type Lesson, type RecurringTx, type Transaction, type WeeklySlot } from '../types'

export interface Repository {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}

const KEY = 'tutor-cashflow:v1' // Keep the existing key so upgrades retain local data.
const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const validDate = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day
}
const nonEmpty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0
const amount = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0

function transaction(value: unknown): value is Transaction {
  if (!isObject(value)) return false
  return nonEmpty(value.id) && (value.type === 'income' || value.type === 'expense') && nonEmpty(value.category) && amount(value.amount) && typeof value.note === 'string' && validDate(value.date) && typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
}
function lesson(value: unknown): value is Lesson {
  if (!isObject(value)) return false
  return nonEmpty(value.id) && validDate(value.date) && typeof value.time === 'string' && /^\d{2}:\d{2}$/.test(value.time) && typeof value.student === 'string' && amount(value.fee) && (value.duration === undefined || amount(value.duration)) && ['scheduled', 'done', 'cancelled'].includes(String(value.status))
}
function slot(value: unknown): value is WeeklySlot {
  if (!isObject(value)) return false
  return nonEmpty(value.id) && Number.isInteger(value.weekday) && Number(value.weekday) >= 0 && Number(value.weekday) <= 6 && typeof value.time === 'string' && /^\d{2}:\d{2}$/.test(value.time) && typeof value.student === 'string' && amount(value.fee) && (value.duration === undefined || amount(value.duration)) && validDate(value.startDate)
}
function recurring(value: unknown): value is RecurringTx {
  if (!isObject(value)) return false
  return nonEmpty(value.id) && (value.type === 'income' || value.type === 'expense') && nonEmpty(value.category) && amount(value.amount) && typeof value.note === 'string' && Number.isInteger(value.dayOfMonth) && Number(value.dayOfMonth) >= 1 && Number(value.dayOfMonth) <= 31 && validDate(value.startDate)
}

/** Coerce imported or persisted data into a safe, backwards-compatible shape. */
export function normalize(parsed: Partial<AppData> | unknown): AppData {
  const base = emptyData()
  if (!isObject(parsed)) return base
  const rawSettings = isObject(parsed.settings) ? parsed.settings : {}
  const rawRules = isObject(rawSettings.merchantRules) ? rawSettings.merchantRules : {}
  const rawBudgets = isObject(rawSettings.budgets) ? rawSettings.budgets : {}
  const merchantRules: Record<string, string> = {}
  for (const [key, value] of Object.entries(rawRules)) if (nonEmpty(key) && nonEmpty(value)) merchantRules[key] = value
  const budgets: Record<string, number> = {}
  for (const [key, value] of Object.entries(rawBudgets)) if (nonEmpty(key) && amount(value)) budgets[key] = value
  const settings = {
    ...base.settings,
    region: nonEmpty(rawSettings.region) ? rawSettings.region : base.settings.region,
    skipHolidays: typeof rawSettings.skipHolidays === 'boolean' ? rawSettings.skipHolidays : base.settings.skipHolidays,
    monthlyGoal: amount(rawSettings.monthlyGoal) ? rawSettings.monthlyGoal : base.settings.monthlyGoal,
    merchantRules,
    budgets,
    openingBalance: typeof rawSettings.openingBalance === 'number' && Number.isFinite(rawSettings.openingBalance) ? rawSettings.openingBalance : base.settings.openingBalance,
  }
  const strings = (value: unknown) => Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []
  return {
    version: 1,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions.filter(transaction) : [],
    lessons: Array.isArray(parsed.lessons) ? parsed.lessons.filter(lesson) : [],
    weeklySlots: Array.isArray(parsed.weeklySlots) ? parsed.weeklySlots.filter(slot) : [],
    skips: strings(parsed.skips),
    recurring: Array.isArray(parsed.recurring) ? parsed.recurring.filter(recurring) : [],
    settings,
    imported: strings(parsed.imported),
  }
}

/** Strict validation for user-requested restore; never silently drop backup records. */
export function validateBackup(parsed: unknown): AppData {
  if (!isObject(parsed) || !(Array.isArray(parsed.transactions) || Array.isArray(parsed.lessons))) {
    throw new Error('Το αρχείο δεν μοιάζει με αντίγραφο Cash Flow.')
  }
  const checks: [string, unknown, (v: unknown) => boolean][] = [
    ['συναλλαγές', parsed.transactions, transaction],
    ['μαθήματα', parsed.lessons, lesson],
    ['εβδομαδιαίο πρόγραμμα', parsed.weeklySlots, slot],
    ['επαναλαμβανόμενες κινήσεις', parsed.recurring, recurring],
  ]
  for (const [label, value, isValid] of checks) {
    if (value !== undefined && (!Array.isArray(value) || !value.every(isValid))) {
      throw new Error(`Το αντίγραφο περιέχει μη έγκυρα στοιχεία (${label}).`)
    }
  }
  for (const key of ['skips', 'imported']) {
    const value = parsed[key]
    if (value !== undefined && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))) {
      throw new Error(`Το αντίγραφο περιέχει μη έγκυρα στοιχεία (${key}).`)
    }
  }
  return normalize(parsed)
}

export class LocalStorageRepository implements Repository {
  async load(): Promise<AppData> {
    const raw = localStorage.getItem(KEY)
    if (!raw) return emptyData()
    try {
      return validateBackup(JSON.parse(raw))
    } catch (error) {
      // Do not silently overwrite a corrupt backup; keep it available for recovery.
      throw new Error(`Τα αποθηκευμένα δεδομένα δεν διαβάζονται: ${error instanceof Error ? error.message : 'άγνωστο σφάλμα'}`)
    }
  }

  async save(data: AppData): Promise<void> {
    // Let quota/private-mode errors reach the UI so the user knows to export a backup.
    localStorage.setItem(KEY, JSON.stringify(data))
  }
}

export const repository: Repository = new LocalStorageRepository()
