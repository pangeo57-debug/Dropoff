import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="sheet-in relative max-h-[92%] w-full max-w-lg overflow-y-auto rounded-t-3xl lg:rounded-3xl border border-fg/10 bg-slate-900 p-5 safe-b">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-fg/20" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-fg">{title}</h2>
          <button onClick={onClose} aria-label="Κλείσιμο" className="rounded-full bg-fg/10 p-2 text-slate-300 active:scale-95">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
