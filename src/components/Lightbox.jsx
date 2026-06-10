import { useEffect } from 'react'
import { Icons } from '../ui/Icons.jsx'

// Visionneuse plein écran d'une photo.
export default function Lightbox({ photo, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(0,0,0,.8)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, background: 'rgba(0,0,0,.5)', border: 'none',
        cursor: 'pointer', color: '#fff', padding: 6, borderRadius: 6,
      }}>
        <Icons.close style={{ width: 20, height: 20 }} />
      </button>
      <img onClick={e => e.stopPropagation()} src={photo.url} alt={photo.caption || ''}
        style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain' }} />
      {photo.caption && (
        <div style={{ marginTop: 12, color: '#fff', fontSize: 14, textAlign: 'center' }}>{photo.caption}</div>
      )}
    </div>
  )
}
