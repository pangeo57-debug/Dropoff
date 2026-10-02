import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from './Sheet'
import type { Lesson } from '../types'

interface Props {
  lesson?: Lesson
  date: string
  defaultFee: number
  onSave: (v: { id?: string; date: string; time: string; student: string; fee: number }) => void
  onDelete?: () => void
  onClose: () => void
}

export function LessonSheet({ lesson, date, defaultFee, onSave, onDelete, onClose }: Props) {
  const [student, setStudent] = useState(lesson?.student ?? '')
  const [time, setTime] = useState(lesson?.time ?? '16:00')
  const [day, setDay] = useState(lesson?.date ?? date)
  const [fee, setFee] = useState(String(lesson?.fee ?? defaultFee))
  const feeNum = parseFloat(fee.replace(',', '.'))
  const valid = student.trim() !== '' && Number.isFinite(feeNum) && feeNum >= 0 && time !== '' && day !== ''
  const field = 'w-full rounded-2xl bg-slate-800 px-4 py-3 outline-none ring-2 ring-transparent focus:ring-indigo-500 placeholder:text-slate-500'

  return (
    <Sheet title={lesson ? 'Επεξεργασία μαθήματος' : 'Νέο μάθημα'} onClose={onClose}>
      <div className="space-y-3">
        <input autoFocus placeholder="Μαθητής / Τμήμα" value={student} onChange={(e) => setStudent(e.target.value)} className={field} />
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          <input type="date" value={day} onChange={(e) => setDay(e.target.value)} className={field} />
        </div>
        <div className="relative">
          <input inputMode="decimal" placeholder="Αμοιβή" value={fee} onChange={(e) => setFee(e.target.value)} className={field} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
        </div>
        <button
          disabled={!valid}
          onClick={() => onSave({ id: lesson?.id, date: day, time, student: student.trim(), fee: feeNum })}
          className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 font-semibold text-white active:scale-[.98] disabled:opacity-40"
        >
          Αποθήκευση
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex w-full items-center justify-center gap-2 py-2 text-sm text-rose-400">
            <Trash2 size={16} /> Διαγραφή μαθήματος
          </button>
        )}
      </div>
    </Sheet>
  )
}
