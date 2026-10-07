import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Sheet } from './Sheet'
import { WEEKDAYS_SHORT } from '../lib/dates'
import type { WeeklySlot } from '../types'

interface Props {
  slot?: WeeklySlot
  weekday: number
  defaultFee: number
  onSave: (v: { id?: string; weekday: number; time: string; student: string; fee: number; duration: number }) => void
  onDelete?: () => void
  onClose: () => void
}

export function SlotSheet({ slot, weekday, defaultFee, onSave, onDelete, onClose }: Props) {
  const [wd, setWd] = useState(slot?.weekday ?? weekday)
  const [student, setStudent] = useState(slot?.student ?? '')
  const [time, setTime] = useState(slot?.time ?? '16:00')
  const [fee, setFee] = useState(String(slot?.fee ?? defaultFee))
  const [dur, setDur] = useState(String(slot?.duration ?? 60))
  const durNum = parseInt(dur, 10)
  const feeNum = parseFloat(fee.replace(',', '.'))
  const valid = student.trim() !== '' && time !== '' && Number.isFinite(feeNum) && feeNum >= 0 && durNum > 0
  const field = 'w-full rounded-2xl bg-slate-800 px-4 py-3 outline-none ring-2 ring-transparent focus:ring-indigo-500 placeholder:text-slate-500'

  return (
    <Sheet title={slot ? 'Πάγιο μάθημα' : 'Νέο πάγιο μάθημα'} onClose={onClose}>
      <p className="mb-3 text-sm text-slate-400">Επαναλαμβάνεται αυτόματα κάθε εβδομάδα.</p>
      <div className="space-y-3">
        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS_SHORT.map((d, i) => (
            <button key={d} onClick={() => setWd(i)} className={`rounded-xl py-2 text-xs font-medium ${i === wd ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'}`}>{d}</button>
          ))}
        </div>
        <input autoFocus placeholder="Μαθητής / Τμήμα" value={student} onChange={(e) => setStudent(e.target.value)} className={field} />
        <div className="grid grid-cols-2 gap-3">
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className={field} />
          <div className="relative">
            <input inputMode="decimal" placeholder="Αμοιβή" value={fee} onChange={(e) => setFee(e.target.value)} className={field} />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">€</span>
          </div>
        </div>
        <div className="relative">
          <input inputMode="numeric" placeholder="Διάρκεια" value={dur} onChange={(e) => setDur(e.target.value)} className={field} />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">λεπτά</span>
        </div>
        <button disabled={!valid} onClick={() => onSave({ id: slot?.id, weekday: wd, time, student: student.trim(), fee: feeNum, duration: durNum })} className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 py-3.5 font-semibold text-white active:scale-[.98] disabled:opacity-40">
          Αποθήκευση
        </button>
        {onDelete && (
          <button onClick={onDelete} className="flex w-full items-center justify-center gap-2 py-2 text-sm text-rose-400">
            <Trash2 size={16} /> Διαγραφή (και μελλοντικών μαθημάτων)
          </button>
        )}
      </div>
    </Sheet>
  )
}
