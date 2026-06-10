import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import Lightbox from './Lightbox.jsx'

function fmtSize(bytes) {
  if (!bytes) return '0 o'
  const u = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

function PhotoCard({ photo, canEdit, onChange, onView }) {
  const [caption, setCaption] = useState(photo.caption || '')

  const save = async () => {
    if (caption === (photo.caption || '')) return
    await api.updatePhoto(photo.id, { caption })
    onChange()
  }
  const remove = async () => {
    if (!confirm('Supprimer définitivement cette photo ? Elle sera détachée de tous les éléments liés.')) return
    await api.deletePhoto(photo.id)
    onChange()
  }

  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
    }}>
      <div style={{ aspectRatio: '4 / 3', background: 'var(--bp-bg)', cursor: 'pointer' }} onClick={() => onView(photo)}>
        <img src={photo.url} alt={photo.caption || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          value={caption} onChange={e => setCaption(e.target.value)} onBlur={save} readOnly={!canEdit}
          placeholder="Légende…"
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontSize: 12, color: 'var(--bp-text)', fontFamily: 'var(--font-body)',
          }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10, color: 'var(--bp-text-muted)' }}>{fmtSize(photo.size)}</span>
          {canEdit && (
            <button onClick={remove} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
              <Icons.trash style={{ width: 13, height: 13, color: '#E87070' }} />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function PhotosView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [photos, setPhotos] = useState([])
  const [usage, setUsage] = useState({ used: 0, limit: 0 })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [viewing, setViewing] = useState(null)
  const fileRef = useRef(null)

  const load = useCallback(() => {
    api.listPhotos().then(setPhotos)
    api.photoUsage().then(setUsage)
  }, [])
  useEffect(() => { load() }, [load])
  useWs((ch) => { if (ch === 'photos') load() }, ['photos'])

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true); setError('')
    try {
      for (const f of files) await api.uploadPhoto(f)
    } catch (err) {
      setError(/413|stockage/i.test(String(err.message)) ? 'Limite de stockage atteinte.' : 'Échec de l\'import.')
    }
    setBusy(false)
    load()
  }

  const pct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Photothèque">
        {canEdit && (
          <>
            <input ref={fileRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={onPick} />
            <Btn variant="accent" onClick={() => fileRef.current?.click()} disabled={busy} style={{ flexShrink: 0 }}>
              <Icons.plus style={{ width: 14, height: 14 }} />
              {busy ? 'Import…' : 'Importer'}
            </Btn>
          </>
        )}
      </SectionHead>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--bp-text-muted)', marginBottom: 4 }}>
          <span>Stockage utilisé</span>
          <span>{fmtSize(usage.used)} / {fmtSize(usage.limit)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--bp-panel)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? '#C85454' : 'var(--bp-accent)', transition: 'width .3s' }} />
        </div>
      </div>

      {error && <div style={{ color: '#E87070', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {photos.length === 0 ? (
        <EmptyState icon={<Icons.photo style={{ width: '100%', height: '100%' }} />} text="Aucune photo dans la photothèque." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {photos.map(p => (
            <PhotoCard key={p.id} photo={p} canEdit={canEdit} onChange={load} onView={setViewing} />
          ))}
        </div>
      )}

      {viewing && <Lightbox photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
