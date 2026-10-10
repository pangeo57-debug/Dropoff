import { useCallback, useEffect, useRef, useState } from 'react'
import type { AppData } from './types'
import { isConfigured, loadCfg } from './lib/cloud'
import { hashData, lastSyncAt, mergeData, syncOnce } from './lib/sync'

export interface SyncState {
  status: 'off' | 'syncing' | 'ok' | 'error'
  at: number
  error?: string
}

/** Keeps the app data in sync with the Supabase copy while sync is switched on in Settings. */
export function useCloudSync(data: AppData, ready: boolean, apply: (d: AppData) => Promise<void>) {
  const [state, setState] = useState<SyncState>({ status: 'off', at: lastSyncAt() })
  const dataRef = useRef(data)
  dataRef.current = data
  const applyRef = useRef(apply)
  applyRef.current = apply
  const busy = useRef(false)

  const run = useCallback(async () => {
    const cfg = loadCfg()
    if (!cfg.sync || !isConfigured(cfg)) {
      setState((s) => (s.status === 'off' ? s : { status: 'off', at: s.at }))
      return
    }
    if (busy.current) return
    busy.current = true
    setState((s) => ({ ...s, status: 'syncing', error: undefined }))
    try {
      const startHash = hashData(dataRef.current)
      const r = await syncOnce(cfg, dataRef.current)
      if (r.changed) {
        // keep edits made while the request was in flight
        const cur = dataRef.current
        await applyRef.current(hashData(cur) === startHash ? r.data : mergeData(cur, r.data, false))
      }
      setState({ status: 'ok', at: Date.now() })
    } catch (e) {
      setState((s) => ({ status: 'error', at: s.at, error: e instanceof Error ? e.message : 'error' }))
    } finally {
      busy.current = false
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    void run()
    const onVisible = () => document.visibilityState === 'visible' && void run()
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('online', onVisible)
    const timer = setInterval(onVisible, 60000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('online', onVisible)
      clearInterval(timer)
    }
  }, [ready, run])

  // push local edits shortly after they happen
  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => void run(), 3000)
    return () => clearTimeout(t)
  }, [data, ready, run])

  return { state, syncNow: run }
}
