import { useState, useEffect } from 'react'

// Largeur de bascule mobile/desktop. En dessous, on bascule sur les layouts
// empilés (nav en tiroir, panneaux full-width, grilles 1 colonne).
export const MOBILE_BREAKPOINT = 768

// Hook isomorphe-safe : renvoie true quand le viewport est <= breakpoint.
// Utilise matchMedia (avec fallback innerWidth) et écoute les changements.
export function useIsMobile(breakpoint = MOBILE_BREAKPOINT) {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia(query)
    const onChange = (e) => setIsMobile(e.matches)
    setIsMobile(mql.matches)
    // addEventListener moderne, fallback addListener pour Safari ancien.
    if (mql.addEventListener) mql.addEventListener('change', onChange)
    else mql.addListener(onChange)
    return () => {
      if (mql.removeEventListener) mql.removeEventListener('change', onChange)
      else mql.removeListener(onChange)
    }
  }, [query])

  return isMobile
}
