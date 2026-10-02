import { useEffect, useState } from 'react'

export type ThemePref = 'system' | 'light' | 'dark'
const KEY = 'cashflow:theme'

const read = (): ThemePref => {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(read)
  const [systemLight, setSystemLight] = useState(() => matchMedia('(prefers-color-scheme: light)').matches)

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: light)')
    const on = () => setSystemLight(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])

  const isLight = pref === 'light' || (pref === 'system' && systemLight)

  useEffect(() => {
    document.documentElement.classList.toggle('light', isLight)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', isLight ? '#eef2f7' : '#0b1020')
  }, [isLight])

  const choose = (p: ThemePref) => {
    setPref(p)
    try {
      localStorage.setItem(KEY, p)
    } catch {
      /* ignore */
    }
  }

  return { pref, isLight, choose }
}
