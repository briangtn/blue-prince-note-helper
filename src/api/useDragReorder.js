import { useState, useCallback } from 'react'

// Réorganisation par glisser-déposer (HTML5 natif) d'une liste de vignettes.
// items : array d'objets ; onReorder(reorderedItems) appelé à la fin du drop.
// Renvoie { dragProps(index), draggingIndex, overIndex }.
export function useDragReorder(items, onReorder) {
  const [draggingIndex, setDraggingIndex] = useState(null)
  const [overIndex, setOverIndex] = useState(null)

  const dragProps = useCallback((index) => ({
    draggable: true,
    onDragStart: (e) => {
      setDraggingIndex(index)
      e.dataTransfer.effectAllowed = 'move'
      // Marqueur interne pour distinguer d'un drop de fichiers externe.
      e.dataTransfer.setData('application/x-bp-reorder', String(index))
    },
    onDragOver: (e) => {
      if (draggingIndex == null) return
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (overIndex !== index) setOverIndex(index)
    },
    onDrop: (e) => {
      if (draggingIndex == null) return
      e.preventDefault()
      e.stopPropagation()
      if (draggingIndex !== index) {
        const next = items.slice()
        const [moved] = next.splice(draggingIndex, 1)
        next.splice(index, 0, moved)
        onReorder(next)
      }
      setDraggingIndex(null)
      setOverIndex(null)
    },
    onDragEnd: () => { setDraggingIndex(null); setOverIndex(null) },
  }), [items, draggingIndex, overIndex, onReorder])

  return { dragProps, draggingIndex, overIndex }
}
