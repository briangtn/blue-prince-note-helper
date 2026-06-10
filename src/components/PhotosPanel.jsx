import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useFileDrop } from '../api/useFileDrop.js'
import { useDragReorder } from '../api/useDragReorder.js'
import PhotoAttachModal from './PhotoAttachModal.jsx'
import Lightbox from './Lightbox.jsx'

// Panneau « Photos » attaché à une entité (type/id) — à poser à côté de LinksPanel.
// - "+ photo" ouvre la popup (import / photothèque)
// - glisser-déposer d'images depuis l'OS : importe + lie en un geste
// - glisser les miniatures pour les réordonner (persiste l'ordre des liens)
// - le × détache (supprime le lien) sans effacer la photo de la photothèque
export default function PhotosPanel({ type, id }) {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [photos, setPhotos] = useState([])
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(() => {
    if (id == null) return
    api.photosFor(type, id).then(setPhotos)
  }, [type, id])

  useEffect(() => { load() }, [load])
  useWs((ch) => { if (ch === 'photos' || ch === 'links') load() }, ['photos', 'links'])

  const detach = async (linkId) => { await api.deleteLink(linkId); load() }

  const uploadAndLink = useCallback(async (files) => {
    if (id == null) return
    setBusy(true)
    try {
      for (const f of files) {
        const photo = await api.uploadPhoto(f)
        await api.createLink({ from_type: type, from_id: id, to_type: 'photo', to_id: photo.id })
      }
    } catch {}
    setBusy(false)
    load()
  }, [type, id, load])

  const { dropProps, active: dropActive } = useFileDrop(uploadAndLink)

  const persistOrder = useCallback((next) => {
    setPhotos(next)
    api.reorderEntityPhotos(type, id, next.map((p) => p.id))
  }, [type, id])
  const { dragProps, draggingIndex } = useDragReorder(photos, persistOrder)

  return (
    <div {...(canEdit ? dropProps : {})} style={{
      padding: 10, borderRadius: 6, background: 'var(--bp-bg)',
      border: `1px solid ${dropActive ? 'var(--bp-accent)' : 'var(--bp-border)'}`,
      transition: 'border-color .15s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bp-text-dim)' }}>
          Photos{busy && <span style={{ color: 'var(--bp-text-muted)', fontWeight: 400 }}> · import…</span>}
        </span>
        {canEdit && (
          <button onClick={() => setAdding(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-accent)', fontSize: 11,
          }}>+ photo</button>
        )}
      </div>

      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6 }}>
          {photos.map((p, i) => (
            <div key={p.id} {...(canEdit ? dragProps(i) : {})} style={{
              position: 'relative', aspectRatio: '1', opacity: draggingIndex === i ? 0.4 : 1,
              cursor: canEdit ? 'grab' : 'default',
            }}>
              <img src={p.url} alt={p.caption || ''} title={p.caption || p.original_name || ''} draggable={false}
                onClick={() => setViewing(p)} style={{
                  width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4,
                  border: '1px solid var(--bp-border)', cursor: 'pointer', display: 'block',
                }} />
              {canEdit && (
                <button onClick={() => detach(p.link_id)} title="Détacher" style={{
                  position: 'absolute', top: 2, right: 2, width: 16, height: 16, borderRadius: 4,
                  border: 'none', cursor: 'pointer', background: 'rgba(0,0,0,.6)', color: '#fff',
                  fontSize: 11, lineHeight: 1, padding: 0,
                }}>×</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !adding && (
          <span style={{ fontSize: 10, color: 'var(--bp-text-muted)' }}>
            {dropActive ? 'Déposez pour attacher' : 'Aucune photo'}
          </span>
        )
      )}

      {adding && <PhotoAttachModal type={type} id={id} onClose={() => setAdding(false)} onAttached={load} />}
      {viewing && <Lightbox photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
