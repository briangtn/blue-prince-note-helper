import { useState, useRef, useCallback } from 'react'

// Glisser-déposer de fichiers depuis l'OS. onFiles(imageFiles) reçoit les
// images déposées. Renvoie { dropProps, active } ; `active` => survol en cours.
// Ignore les drags internes de réorganisation (marqueur x-bp-reorder).
export function useFileDrop(onFiles) {
  const [active, setActive] = useState(false)
  const depth = useRef(0)

  const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')

  const dropProps = {
    onDragEnter: useCallback((e) => {
      if (!hasFiles(e)) return
      e.preventDefault(); depth.current++; setActive(true)
    }, []),
    onDragOver: useCallback((e) => {
      if (!hasFiles(e)) return
      e.preventDefault(); e.dataTransfer.dropEffect = 'copy'
    }, []),
    onDragLeave: useCallback((e) => {
      if (!hasFiles(e)) return
      depth.current = Math.max(0, depth.current - 1)
      if (depth.current === 0) setActive(false)
    }, []),
    onDrop: useCallback((e) => {
      if (!hasFiles(e)) return
      e.preventDefault(); depth.current = 0; setActive(false)
      const imgs = Array.from(e.dataTransfer.files).filter((f) => /^image\//.test(f.type))
      if (imgs.length) onFiles(imgs)
    }, [onFiles]),
  }

  return { dropProps, active }
}
