export type TxType = 'income' | 'expense'
export type LessonStatus = 'scheduled' | 'done' | 'cancelled'

export interface Transaction {
  id: string
  type: TxType
  category: string
  amount: number
  note: string
  date: string // YYYY-MM-DD (local)
  createdAt: number
  lessonId?: string // set when auto-created from a completed lesson
  recurringId?: string // set when auto-created from a recurring item
  source?: 'auto' // imported from the iPhone inbox file
}

export interface Lesson {
  id: string
  date: string // YYYY-MM-DD (local)
  time: string // HH:mm
  student: string
  fee: number
  duration?: number // minutes, default 60
  status: LessonStatus
  slotId?: string // set when generated from the weekly programme
}

export interface WeeklySlot {
  id: string
  weekday: number // Mon=0 … Sun=6
  time: string
  student: string
  fee: number
  duration?: number
  startDate: string // lessons are generated from this date on
}

export interface RecurringTx {
  id: string
  type: TxType
  category: string
  amount: number
  note: string
  dayOfMonth: number // 1-31 (short months use their last day)
  startDate: string
}

export interface Settings {
  region: string
  skipHolidays: boolean // don't auto-create weekly lessons on holidays
  monthlyGoal: number // target income per month, 0 = none
  merchantRules: Record<string, string> // learned: normalised merchant → category
  budgets: Record<string, number> // monthly limit per expense category
  openingBalance: number // money you had before using the app
}

export interface AppData {
  version: 1
  transactions: Transaction[]
  lessons: Lesson[]
  weeklySlots: WeeklySlot[]
  skips: string[] // `${slotId}|${date}` / `rec:${id}|${date}` occurrences removed by the user
  recurring: RecurringTx[]
  settings: Settings
  imported: string[] // inbox lines already imported (dedupe)
}

export const emptyData = (): AppData => ({ version: 1, transactions: [], lessons: [], weeklySlots: [], skips: [], recurring: [], settings: { region: 'patra', skipHolidays: true, monthlyGoal: 0, merchantRules: {}, budgets: {}, openingBalance: 0 }, imported: [] })
