import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import PhotoAttachModal from './PhotoAttachModal.jsx'
import Lightbox from './Lightbox.jsx'

// Panneau « Photos » attaché à une entité (type/id) — à poser à côté de LinksPanel.
// Le retrait détache la photo (supprime le lien) sans l'effacer de la photothèque.
export default function PhotosPanel({ type, id }) {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [photos, setPhotos] = useState([])
  const [adding, setAdding] = useState(false)
  const [viewing, setViewing] = useState(null)

  const load = useCallback(() => {
    if (id == null) return
    api.photosFor(type, id).then(setPhotos)
  }, [type, id])

  useEffect(() => { load() }, [load])
  useWs((ch) => { if (ch === 'photos' || ch === 'links') load() }, ['photos', 'links'])

  const detach = async (linkId) => { await api.deleteLink(linkId); load() }

  return (
    <div style={{ padding: 10, borderRadius: 6, background: 'var(--bp-bg)', border: '1px solid var(--bp-border)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bp-text-dim)' }}>Photos</span>
        {canEdit && (
          <button onClick={() => setAdding(true)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-accent)', fontSize: 11,
          }}>+ photo</button>
        )}
      </div>

      {photos.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(64px, 1fr))', gap: 6 }}>
          {photos.map(p => (
            <div key={p.id} style={{ position: 'relative', aspectRatio: '1' }}>
              <img src={p.url} alt={p.caption || ''} title={p.caption || p.original_name || ''}
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
        !adding && <span style={{ fontSize: 10, color: 'var(--bp-text-muted)' }}>Aucune photo</span>
      )}

      {adding && <PhotoAttachModal type={type} id={id} onClose={() => setAdding(false)} onAttached={load} />}
      {viewing && <Lightbox photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
