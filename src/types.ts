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
}

export interface AppData {
  version: 1
  transactions: Transaction[]
  lessons: Lesson[]
}

export const emptyData = (): AppData => ({ version: 1, transactions: [], lessons: [] })
