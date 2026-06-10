import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from './client.js'
import { useWs } from './useWs.js'
import { colorForName } from './tagColors.js'

// Catalogue des tags (façon labels GitHub). Renvoie la liste, une fonction
// couleur (avec repli stable pour un nom pas encore enregistré) et un créateur.
export function useTags() {
  const [tags, setTags] = useState([])
  const load = useCallback(() => api.listTags().then(setTags), [])
  useEffect(() => { load() }, [load])
  useWs((ch) => { if (ch === 'tags') load() }, ['tags'])

  const colorMap = useMemo(() => Object.fromEntries(tags.map((t) => [t.name, t.color])), [tags])
  const colorOf = useCallback((name) => colorMap[name] || colorForName(name), [colorMap])

  // Crée le tag s'il n'existe pas encore (le serveur assigne une couleur stable).
  const ensure = useCallback(async (name) => {
    if (colorMap[name]) return
    try { await api.createTag({ name }) } catch {}
  }, [colorMap])

  return { tags, colorOf, ensure, reload: load }
}
