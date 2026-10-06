import { emptyData, type AppData } from '../types'

/**
 * Persistence boundary. The UI only talks to this interface, so a Supabase
 * (or any REST) implementation can be dropped in without touching components:
 *
 *   export const repository: Repository = new SupabaseRepository(client)
 */
export interface Repository {
  load(): Promise<AppData>
  save(data: AppData): Promise<void>
}

const KEY = 'tutor-cashflow:v1'

/** Validates/normalises anything that looks like saved data (also used for imports). */
export function normalize(parsed: Partial<AppData>): AppData {
  const base = emptyData()
  return {
    version: 1,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    lessons: Array.isArray(parsed.lessons) ? parsed.lessons : [],
    weeklySlots: Array.isArray(parsed.weeklySlots) ? parsed.weeklySlots : [],
    skips: Array.isArray(parsed.skips) ? parsed.skips : [],
    recurring: Array.isArray(parsed.recurring) ? parsed.recurring : [],
    settings: { ...base.settings, ...parsed.settings },
    imported: Array.isArray(parsed.imported) ? parsed.imported : [],
  }
}

export class LocalStorageRepository implements Repository {
  async load(): Promise<AppData> {
    try {
      const raw = localStorage.getItem(KEY)
      if (!raw) return emptyData()
      return normalize(JSON.parse(raw) as Partial<AppData>)
    } catch {
      return emptyData()
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      localStorage.setItem(KEY, JSON.stringify(data))
    } catch {
      /* quota / private mode: keep working in memory */
    }
  }
}

export const repository: Repository = new LocalStorageRepository()
