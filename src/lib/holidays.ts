import { toISO } from './dates'

export interface Region {
  id: string
  label: string
  local: { month: number; day: number; name: string }[] // month 1-12
}

// Local holidays are best-effort (patron-saint days); the user can verify with their municipality.
export const REGIONS: Region[] = [
  { id: 'patra', label: 'Πάτρα', local: [{ month: 11, day: 30, name: 'Αγίου Ανδρέα (τοπική)' }] },
  { id: 'athens', label: 'Αθήνα', local: [] },
  { id: 'thessaloniki', label: 'Θεσσαλονίκη', local: [{ month: 10, day: 26, name: 'Αγίου Δημητρίου (τοπική)' }] },
  { id: 'heraklion', label: 'Ηράκλειο', local: [{ month: 8, day: 25, name: 'Αγίου Τίτου (τοπική)' }] },
  { id: 'larisa', label: 'Λάρισα', local: [{ month: 5, day: 15, name: 'Αγίου Αχιλλίου (τοπική)' }] },
  { id: 'other', label: 'Άλλη (μόνο εθνικές)', local: [] },
]

// Orthodox Easter (Meeus Julian algorithm + 13 days, valid 1900–2099)
export function orthodoxEaster(year: number): Date {
  const a = year % 4
  const b = year % 7
  const c = year % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const month = Math.floor((d + e + 114) / 31)
  const day = ((d + e + 114) % 31) + 1
  return new Date(year, month - 1, day + 13)
}

const cache = new Map<string, Map<string, string>>()

export function holidaysFor(year: number, regionId: string): Map<string, string> {
  const key = `${year}|${regionId}`
  const hit = cache.get(key)
  if (hit) return hit
  const map = new Map<string, string>()
  const fixed = (m: number, d: number, name: string) => map.set(toISO(new Date(year, m - 1, d)), name)
  const easter = orthodoxEaster(year)
  const rel = (offset: number, name: string) => map.set(toISO(new Date(year, easter.getMonth(), easter.getDate() + offset)), name)

  fixed(1, 1, 'Πρωτοχρονιά')
  fixed(1, 6, 'Θεοφάνεια')
  rel(-48, 'Καθαρά Δευτέρα')
  fixed(3, 25, '25η Μαρτίου')
  rel(-2, 'Μεγάλη Παρασκευή')
  rel(0, 'Κυριακή του Πάσχα')
  rel(1, 'Δευτέρα του Πάσχα')
  fixed(5, 1, 'Εργατική Πρωτομαγιά')
  rel(50, 'Αγίου Πνεύματος')
  fixed(8, 15, 'Δεκαπενταύγουστος')
  fixed(10, 28, '28η Οκτωβρίου')
  fixed(12, 25, 'Χριστούγεννα')
  fixed(12, 26, 'Σύναξη Θεοτόκου')
  for (const l of REGIONS.find((r) => r.id === regionId)?.local ?? []) fixed(l.month, l.day, l.name)

  cache.set(key, map)
  return map
}

export const holidayName = (iso: string, regionId: string): string | undefined =>
  holidaysFor(Number(iso.slice(0, 4)), regionId).get(iso)
