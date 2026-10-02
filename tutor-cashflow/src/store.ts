import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyData, type AppData, type Lesson, type Transaction } from './types'
import { repository } from './storage/repository'
import { LESSON_CATEGORY } from './constants'

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function useAppData() {
  const [data, setData] = useState<AppData>(emptyData())
  const [ready, setReady] = useState(false)
  const loaded = useRef(false)

  useEffect(() => {
    repository.load().then((d) => {
      loaded.current = true
      setData(d)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    if (loaded.current) void repository.save(data)
  }, [data])

  const update = useCallback((fn: (d: AppData) => AppData) => setData((d) => fn(d)), [])

  const addTransaction = (t: Omit<Transaction, 'id' | 'createdAt'>) =>
    update((d) => ({ ...d, transactions: [...d.transactions, { ...t, id: uid(), createdAt: Date.now() }] }))

  const deleteTransaction = (id: string) =>
    update((d) => ({
      ...d,
      transactions: d.transactions.filter((t) => t.id !== id),
      // deleting the auto income of a lesson puts the lesson back to "scheduled"
      lessons: d.lessons.map((l) => {
        const linked = d.transactions.find((t) => t.id === id)?.lessonId
        return linked === l.id && l.status === 'done' ? { ...l, status: 'scheduled' as const } : l
      }),
    }))

  const saveLesson = (l: Omit<Lesson, 'id' | 'status'> & { id?: string }) =>
    update((d) => {
      if (l.id) {
        return {
          lessons: d.lessons.map((x) => (x.id === l.id ? { ...x, date: l.date, time: l.time, student: l.student, fee: l.fee } : x)),
          // keep the linked income in sync if the lesson was already paid
          transactions: d.transactions.map((t) =>
            t.lessonId === l.id ? { ...t, amount: l.fee, date: l.date, note: l.student } : t,
          ),
          version: 1,
        }
      }
      return { ...d, lessons: [...d.lessons, { ...l, id: uid(), status: 'scheduled' }] }
    })

  const setLessonStatus = (id: string, status: Lesson['status']) =>
    update((d) => {
      const lesson = d.lessons.find((l) => l.id === id)
      if (!lesson) return d
      const withoutIncome = d.transactions.filter((t) => t.lessonId !== id)
      const transactions =
        status === 'done'
          ? [
              ...withoutIncome,
              {
                id: uid(),
                type: 'income' as const,
                category: LESSON_CATEGORY,
                amount: lesson.fee,
                note: lesson.student,
                date: lesson.date,
                createdAt: Date.now(),
                lessonId: id,
              },
            ]
          : withoutIncome
      return { ...d, transactions, lessons: d.lessons.map((l) => (l.id === id ? { ...l, status } : l)) }
    })

  const deleteLesson = (id: string) =>
    update((d) => ({
      ...d,
      lessons: d.lessons.filter((l) => l.id !== id),
      transactions: d.transactions.filter((t) => t.lessonId !== id),
    }))

  return { data, ready, addTransaction, deleteTransaction, saveLesson, setLessonStatus, deleteLesson }
}
