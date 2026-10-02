import { useCallback, useEffect, useRef, useState } from 'react'
import { emptyData, type AppData, type Lesson, type Transaction, type WeeklySlot } from './types'
import { addDays, todayISO, weekdayIndex } from './lib/dates'
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
        const old = d.lessons.find((x) => x.id === l.id)
        const moved = old?.slotId && old.date !== l.date
        return {
          ...d,
          skips: moved ? [...d.skips, `${old.slotId}|${old.date}`] : d.skips,
          lessons: d.lessons.map((x) => (x.id === l.id ? { ...x, date: l.date, time: l.time, student: l.student, fee: l.fee } : x)),
          // keep the linked income in sync if the lesson was already paid
          transactions: d.transactions.map((t) =>
            t.lessonId === l.id ? { ...t, amount: l.fee, date: l.date, note: l.student } : t,
          ),
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
    update((d) => {
      const l = d.lessons.find((x) => x.id === id)
      return {
      ...d,
      skips: l?.slotId ? [...d.skips, `${l.slotId}|${l.date}`] : d.skips,
      lessons: d.lessons.filter((l) => l.id !== id),
      transactions: d.transactions.filter((t) => t.lessonId !== id),
      }
    })

  // Create lessons from the weekly programme for every day in [from, to].
  const ensureRange = useCallback((from: string, to: string) => {
    setData((d) => {
      if (d.weeklySlots.length === 0) return d
      const known = new Set(d.lessons.filter((l) => l.slotId).map((l) => `${l.slotId}|${l.date}`))
      d.skips.forEach((k) => known.add(k))
      const created: Lesson[] = []
      for (let day = from; day <= to; day = addDays(day, 1)) {
        for (const s of d.weeklySlots) {
          if (s.weekday !== weekdayIndex(day) || day < s.startDate || known.has(`${s.id}|${day}`)) continue
          created.push({ id: uid(), date: day, time: s.time, student: s.student, fee: s.fee, status: 'scheduled', slotId: s.id })
        }
      }
      return created.length ? { ...d, lessons: [...d.lessons, ...created] } : d
    })
  }, [])

  const saveSlot = (s: Omit<WeeklySlot, 'id' | 'startDate'> & { id?: string }) =>
    update((d) => {
      const today = todayISO()
      if (!s.id) return { ...d, weeklySlots: [...d.weeklySlots, { ...s, id: uid(), startDate: today }] }
      // an edit applies to the slot and to its not-yet-done lessons from today on
      return {
        ...d,
        weeklySlots: d.weeklySlots.map((x) => (x.id === s.id ? { ...x, weekday: s.weekday, time: s.time, student: s.student, fee: s.fee } : x)),
        lessons: d.lessons
          .filter((l) => !(l.slotId === s.id && l.status === 'scheduled' && l.date >= today && weekdayIndex(l.date) !== s.weekday))
          .map((l) => (l.slotId === s.id && l.status === 'scheduled' && l.date >= today ? { ...l, time: s.time, student: s.student, fee: s.fee } : l)),
      }
    })

  // Turn the one-off lessons of a week into weekly recurring slots.
  const saveWeekAsProgramme = (from: string, to: string) =>
    update((d) => {
      const today = todayISO()
      const slots = [...d.weeklySlots]
      const linked = new Map<string, string>() // lessonId -> slotId
      for (const l of d.lessons) {
        if (l.slotId || l.status === 'cancelled' || l.date < from || l.date > to) continue
        const weekday = weekdayIndex(l.date)
        let slot = slots.find((x) => x.weekday === weekday && x.time === l.time && x.student === l.student)
        if (!slot) {
          slot = { id: uid(), weekday, time: l.time, student: l.student, fee: l.fee, startDate: from > today ? from : today }
          slots.push(slot)
        }
        linked.set(l.id, slot.id)
      }
      if (linked.size === 0) return d
      return { ...d, weeklySlots: slots, lessons: d.lessons.map((l) => (linked.has(l.id) ? { ...l, slotId: linked.get(l.id) } : l)) }
    })

  const deleteSlot = (id: string) =>
    update((d) => {
      const today = todayISO()
      return {
        ...d,
        weeklySlots: d.weeklySlots.filter((s) => s.id !== id),
        lessons: d.lessons.filter((l) => !(l.slotId === id && l.status === 'scheduled' && l.date >= today)),
      }
    })

  return { data, ready, addTransaction, deleteTransaction, saveLesson, setLessonStatus, deleteLesson, ensureRange, saveSlot, saveWeekAsProgramme, deleteSlot }
}
