import type { AppData, Lesson, Transaction } from '../types'
import { normalize } from '../storage/repository'
import { rpc, type CloudCfg } from './cloud'

const META_KEY = 'cashflow:syncMeta'
const CAP = 5000

interface Meta { base: number; hash: string; at: number }

const loadMeta = (): Meta => {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) ?? '{}') as Partial<Meta>
    return { base: m.base ?? 0, hash: m.hash ?? '', at: m.at ?? 0 }
  } catch {
    return { base: 0, hash: '', at: 0 }
  }
}
const saveMeta = (m: Meta) => {
  try {
    localStorage.setItem(META_KEY, JSON.stringify(m))
  } catch {
    /* ignore */
  }
}
export const lastSyncAt = () => loadMeta().at

/** Cheap stable fingerprint of the data (FNV-1a over the JSON). */
export function hashData(d: AppData): string {
  const s = JSON.stringify(d)
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return `${s.length}:${(h >>> 0).toString(16)}`
}

function unionById<T extends { id: string }>(local: T[], remote: T[], dead: Set<string>, preferRemote: boolean): T[] {
  const map = new Map<string, T>()
  for (const r of preferRemote ? [...local, ...remote] : [...remote, ...local]) if (!dead.has(r.id)) map.set(r.id, r)
  return [...map.values()]
}

/** Two devices can each generate the same slot lesson / recurring payment with different ids: keep one. */
function dedupe<T extends { id: string }>(items: T[], key: (t: T) => string | undefined, rank: (t: T) => number): T[] {
  const best = new Map<string, T>()
  const out: T[] = []
  for (const it of items) {
    const k = key(it)
    if (!k) { out.push(it); continue }
    const cur = best.get(k)
    if (!cur || rank(it) > rank(cur)) best.set(k, it)
  }
  return [...out, ...best.values()]
}

/** Merge two copies of the data: union of records minus deletions; on conflict the preferred side wins. */
export function mergeData(local: AppData, remote: AppData, preferRemote: boolean): AppData {
  const dead = new Set([...local.tombstones, ...remote.tombstones])
  const lessonRank = (l: Lesson) => (l.status === 'done' ? 2 : l.status === 'cancelled' ? 1 : 0)
  const lessons = dedupe(unionById(local.lessons, remote.lessons, dead, preferRemote), (l) => (l.slotId ? `${l.slotId}|${l.date}` : undefined), lessonRank)
  const lessonIds = new Set(lessons.map((l) => l.id))
  const txs = dedupe<Transaction>(unionById(local.transactions, remote.transactions, dead, preferRemote), (t) => (t.recurringId ? `${t.recurringId}|${t.date}` : undefined), () => 0)
    // a payment linked to a lesson that no longer exists would be orphaned
    .filter((t) => !t.lessonId || lessonIds.has(t.lessonId))
  const pref = preferRemote ? remote : local
  const other = preferRemote ? local : remote
  const sortKeys = <V,>(o: Record<string, V>) => Object.fromEntries(Object.entries(o).sort(([x], [y]) => x.localeCompare(y)))
  // Canonical order: both devices must compute byte-identical results, otherwise they would keep re-pushing each other's ordering.
  return normalize({
    version: 1,
    transactions: txs.sort((x, y) => x.createdAt - y.createdAt || x.id.localeCompare(y.id)),
    lessons: lessons.sort((x, y) => x.date.localeCompare(y.date) || x.time.localeCompare(y.time) || x.id.localeCompare(y.id)),
    weeklySlots: unionById(local.weeklySlots, remote.weeklySlots, dead, preferRemote).sort((x, y) => x.id.localeCompare(y.id)),
    recurring: unionById(local.recurring, remote.recurring, dead, preferRemote).sort((x, y) => x.id.localeCompare(y.id)),
    skips: [...new Set([...local.skips, ...remote.skips])].sort(),
    imported: [...new Set([...local.imported, ...remote.imported])].sort().slice(-CAP),
    tombstones: [...dead].sort().slice(-CAP),
    settings: {
      ...other.settings,
      ...pref.settings,
      merchantRules: sortKeys({ ...other.settings.merchantRules, ...pref.settings.merchantRules }),
      budgets: sortKeys({ ...other.settings.budgets, ...pref.settings.budgets }),
    },
  })
}

interface PullRow { out_data: unknown; out_version: number }
interface PushRow { out_ok: boolean; out_version: number; out_data: unknown }

export interface SyncResult {
  data: AppData
  changed: boolean // `data` differs from what was passed in (apply it locally)
  pushed: boolean
}

/** One sync round: pull, merge if the cloud moved, push if we have news. Throws on network/server errors. */
export async function syncOnce(cfg: CloudCfg, local: AppData): Promise<SyncResult> {
  const meta = loadMeta()
  const localHash = hashData(local)
  const rows = (await rpc<PullRow[]>(cfg, 'pull_state', { p_token: cfg.token })) ?? []
  const remote = rows[0]

  const push = async (data: AppData, base: number) => {
    const res = (await rpc<PushRow[]>(cfg, 'push_state', { p_token: cfg.token, p_data: data, p_base: base })) ?? []
    return res[0]
  }

  let current = local
  let base = remote ? Number(remote.out_version) : 0
  let remoteData = remote ? normalize(remote.out_data) : null

  for (let attempt = 0; attempt < 3; attempt++) {
    let next = current
    if (remoteData && base !== meta.base) {
      // the cloud moved since we last synced (or this is a new device): merge, cloud wins ties
      next = mergeData(current, remoteData, true)
    } else if (remoteData && hashData(current) === meta.hash) {
      saveMeta({ ...meta, at: Date.now() })
      return { data: local, changed: false, pushed: false }
    }
    console.log('SYNCDBG push', JSON.stringify({ attempt, base, metaBase: meta.base, metaHash: meta.hash, curHash: hashData(current), nextHash: hashData(next), localHash }))
    if (remoteData && base === Number(remote?.out_version) && hashData(next) === hashData(remoteData)) {
      // merging produced exactly what the cloud already has: nothing to push
      saveMeta({ base, hash: hashData(next), at: Date.now() })
      return { data: next, changed: hashData(next) !== localHash, pushed: false }
    }
    const res = await push(next, base)
    if (res?.out_ok) {
      saveMeta({ base: Number(res.out_version), hash: hashData(next), at: Date.now() })
      return { data: next, changed: hashData(next) !== localHash, pushed: true }
    }
    if (!res || !res.out_data) throw new Error('push')
    // someone pushed in between: merge with what they have and retry
    current = next
    base = Number(res.out_version)
    remoteData = normalize(res.out_data)
    meta.base = -1 // force the merge branch on retry
  }
  throw new Error('conflict')
}
