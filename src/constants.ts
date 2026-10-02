import {
  Apple, Bus, Coffee, Dices, Fuel, GraduationCap, HandCoins, ListChecks, PartyPopper, Pill,
  Plane, Plus, Route, Shuffle, ShoppingBag, ShoppingCart, Utensils, Zap,
  type LucideIcon,
} from 'lucide-react'
import type { TxType } from './types'

export interface Category {
  id: string
  label: string
  icon: LucideIcon
  color: string
}

export const LESSON_CATEGORY = 'Μάθημα'

export const INCOME_CATEGORIES: Category[] = [
  { id: 'Μάθημα', label: 'Μάθημα', icon: GraduationCap, color: '#34d399' },
  { id: 'Tips', label: 'Tips / Φιλοδώρημα', icon: HandCoins, color: '#2dd4bf' },
  { id: 'Τζόγος', label: 'Τζόγος / Στοίχημα', icon: Dices, color: '#a3e635' },
  { id: 'Άλλο Έσοδο', label: 'Άλλο Έσοδο', icon: Plus, color: '#38bdf8' },
]

export const EXPENSE_CATEGORIES: Category[] = [
  { id: 'Τρόφιμα', label: 'Τρόφιμα', icon: Apple, color: '#f43f5e' },
  { id: 'Μετακινήσεις', label: 'Μετακινήσεις', icon: Bus, color: '#f97316' },
  { id: 'Βενζίνη', label: 'Βενζίνη', icon: Fuel, color: '#f59e0b' },
  { id: 'Διόδια', label: 'Διόδια', icon: Route, color: '#eab308' },
  { id: 'Ταξίδια', label: 'Ταξίδια', icon: Plane, color: '#38bdf8' },
  { id: 'Φαγητό', label: 'Φαγητό', icon: Utensils, color: '#fb7185' },
  { id: 'Καφές', label: 'Καφές', icon: Coffee, color: '#a16207' },
  { id: 'Σούπερ Μάρκετ', label: 'Σούπερ Μάρκετ', icon: ShoppingCart, color: '#22c55e' },
  { id: 'Ρεύμα', label: 'Ρεύμα', icon: Zap, color: '#facc15' },
  { id: 'Τα απαραίτητα', label: 'Τα απαραίτητα', icon: ListChecks, color: '#818cf8' },
  { id: 'Αγορές', label: 'Αγορές', icon: ShoppingBag, color: '#c084fc' },
  { id: 'Διασκέδαση', label: 'Διασκέδαση', icon: PartyPopper, color: '#e879f9' },
  { id: 'Υγεία', label: 'Υγεία / Φαρμακείο', icon: Pill, color: '#2dd4bf' },
  { id: 'Κουλουλού', label: 'Κουλουλού (διάφορα)', icon: Shuffle, color: '#94a3b8' },
]

export const categoriesFor = (t: TxType) => (t === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES)

export const findCategory = (id: string): Category =>
  [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES].find((c) => c.id === id) ?? EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1]

// Categories counted as "transport" for the fuel/tolls insight.
export const TRANSPORT_CATEGORIES = ['Βενζίνη', 'Διόδια', 'Μετακινήσεις']
export const EATING_OUT_CATEGORIES = ['Φαγητό', 'Καφές']
