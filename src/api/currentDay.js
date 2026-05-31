import { useState, useEffect, useCallback } from 'react'

const KEY = 'bp_current_day'
const EVENT = 'bp-current-day'

export function getCurrentDay() {
  const v = localStorage.getItem(KEY)
  return v ? Number(v) : null
}

export function setCurrentDay(n) {
  const num = n == null ? null : Number(n)
  if (num == null || Number.isNaN(num)) {
    localStorage.removeItem(KEY)
  } else {
    localStorage.setItem(KEY, String(num))
  }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: num }))
}

export function useCurrentDay() {
  const [current, setCurrent] = useState(getCurrentDay)

  useEffect(() => {
    const handler = (e) => setCurrent(e.detail ?? null)
    window.addEventListener(EVENT, handler)
    return () => window.removeEventListener(EVENT, handler)
  }, [])

  const set = useCallback((n) => setCurrentDay(n), [])

  return [current, set]
}
