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
}

export interface Lesson {
  id: string
  date: string // YYYY-MM-DD (local)
  time: string // HH:mm
  student: string
  fee: number
  status: LessonStatus
  slotId?: string // set when generated from the weekly programme
}

export interface WeeklySlot {
  id: string
  weekday: number // Mon=0 … Sun=6
  time: string
  student: string
  fee: number
  startDate: string // lessons are generated from this date on
}

export interface AppData {
  version: 1
  transactions: Transaction[]
  lessons: Lesson[]
  weeklySlots: WeeklySlot[]
  skips: string[] // `${slotId}|${date}` occurrences removed by the user
}

export const emptyData = (): AppData => ({ version: 1, transactions: [], lessons: [], weeklySlots: [], skips: [] })
