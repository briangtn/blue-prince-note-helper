import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useFileDrop } from '../api/useFileDrop.js'
import { useDragReorder } from '../api/useDragReorder.js'
import { Input, Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import TagInput from './TagInput.jsx'
import Lightbox from './Lightbox.jsx'

function fmtSize(bytes) {
  if (!bytes) return '0 o'
  const u = ['o', 'Ko', 'Mo', 'Go']
  const i = Math.min(u.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  return `${(bytes / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${u[i]}`
}

function PhotoCard({ photo, canEdit, onChange, onView, dragHandlers, dragging }) {
  const [caption, setCaption] = useState(photo.caption || '')

  const saveCaption = async () => {
    if (caption === (photo.caption || '')) return
    await api.updatePhoto(photo.id, { caption })
    onChange()
  }
  const saveTags = async (tags) => { await api.updatePhoto(photo.id, { tags }); onChange() }
  const remove = async () => {
    if (!confirm('Supprimer définitivement cette photo ? Elle sera détachée de tous les éléments liés.')) return
    await api.deletePhoto(photo.id)
    onChange()
  }

  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)',
      overflow: 'hidden', display: 'flex', flexDirection: 'column',
      opacity: dragging ? 0.4 : 1,
    }}>
      <div {...(dragHandlers || {})}
        style={{ aspectRatio: '4 / 3', background: 'var(--bp-bg)', cursor: dragHandlers ? 'grab' : 'pointer' }}
        onClick={() => onView(photo)}>
        <img src={photo.url} alt={photo.caption || ''} draggable={false}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <input
          value={caption} onChange={e => setCaption(e.target.value)} onBlur={saveCaption} readOnly={!canEdit}
          placeholder="Légende…"
          style={{
            width: '100%', background: 'transparent', border: 'none', outline: 'none',
            fontSize: 12, color: 'var(--bp-text)', fontFamily: 'var(--font-body)',
          }} />
        <TagInput value={photo.tags || []} onChange={saveTags} readOnly={!canEdit} />
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
  const [activeTags, setActiveTags] = useState([])
  const [query, setQuery] = useState('')
  const fileRef = useRef(null)

  const load = useCallback(() => {
    api.listPhotos().then(setPhotos)
    api.photoUsage().then(setUsage)
  }, [])
  useEffect(() => { load() }, [load])
  useWs((ch) => { if (ch === 'photos') load() }, ['photos'])

  const uploadFiles = useCallback(async (files) => {
    setBusy(true); setError('')
    try {
      for (const f of files) await api.uploadPhoto(f)
    } catch (err) {
      setError(/413|stockage/i.test(String(err.message)) ? 'Limite de stockage atteinte.' : 'Échec de l\'import.')
    }
    setBusy(false)
    load()
  }, [load])

  const onPick = async (e) => {
    const files = Array.from(e.target.files || [])
    e.target.value = ''
    if (files.length) uploadFiles(files)
  }

  const { dropProps, active: dropActive } = useFileDrop(uploadFiles)

  // Tags présents dans la photothèque (pour la barre de filtre).
  // La recherche filtre aussi la liste des tags proposés.
  const q = query.trim().toLowerCase()
  const allTags = [...new Set(photos.flatMap((p) => p.tags || []))]
    .filter((t) => !q || t.toLowerCase().includes(q))
    .sort((a, b) => a.localeCompare(b))
  const toggleTag = (t) => setActiveTags((cur) => cur.includes(t) ? cur.filter((x) => x !== t) : [...cur, t])
  const filtering = activeTags.length > 0 || q.length > 0
  // Recherche : la légende OU un tag contient le texte saisi.
  const matchQuery = (p) =>
    !q || (p.caption || '').toLowerCase().includes(q) || (p.tags || []).some((t) => t.toLowerCase().includes(q))
  const shown = photos.filter((p) => activeTags.every((t) => (p.tags || []).includes(t)) && matchQuery(p))

  // Réorganisation : seulement sans filtre actif (l'ordre est global).
  const persistOrder = useCallback((next) => {
    setPhotos(next)
    api.reorderPhotos(next.map((p) => p.id))
  }, [])
  const { dragProps, draggingIndex } = useDragReorder(shown, persistOrder)

  const pct = usage.limit ? Math.min(100, (usage.used / usage.limit) * 100) : 0

  return (
    <div {...(canEdit ? dropProps : {})} style={{
      maxWidth: 1100, margin: '0 auto', padding: '24px 28px', height: '100%', overflow: 'auto',
      position: 'relative',
    }}>
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

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--bp-text-muted)', marginBottom: 4 }}>
          <span>Stockage utilisé</span>
          <span>{fmtSize(usage.used)} / {fmtSize(usage.limit)}</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--bp-panel)', overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: pct > 90 ? '#C85454' : 'var(--bp-accent)', transition: 'width .3s' }} />
        </div>
      </div>

      {photos.length > 0 && (
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Icons.search style={{
            width: 14, height: 14, position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--bp-text-muted)', pointerEvents: 'none',
          }} />
          <Input value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher une légende ou un tag…" style={{ paddingLeft: 32 }} />
          {q && (
            <button onClick={() => setQuery('')} style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)', fontSize: 16,
            }}>×</button>
          )}
        </div>
      )}

      {allTags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>Tags :</span>
          {allTags.map((t) => {
            const on = activeTags.includes(t)
            return (
              <button key={t} onClick={() => toggleTag(t)} style={{
                padding: '2px 10px', borderRadius: 12, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${on ? 'var(--bp-accent)' : 'var(--bp-border)'}`,
                background: on ? 'var(--bp-accent)' : 'transparent',
                color: on ? '#fff' : 'var(--bp-text-dim)',
              }}>{t}</button>
            )
          })}
          {activeTags.length > 0 && (
            <button onClick={() => setActiveTags([])} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)', fontSize: 11,
            }}>× effacer</button>
          )}
        </div>
      )}

      {error && <div style={{ color: '#E87070', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      {shown.length === 0 ? (
        <EmptyState icon={<Icons.photo style={{ width: '100%', height: '100%' }} />}
          text={filtering ? 'Aucune photo pour cette recherche.' : 'Aucune photo. Glissez des images ici ou cliquez sur Importer.'} />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
          {shown.map((p, i) => (
            <PhotoCard key={p.id} photo={p} canEdit={canEdit} onChange={load} onView={setViewing}
              dragHandlers={canEdit && !filtering ? dragProps(i) : null}
              dragging={!filtering && draggingIndex === i} />
          ))}
        </div>
      )}

      {filtering && canEdit && (
        <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginTop: 12 }}>
          Effacez la recherche et les tags pour réorganiser les photos.
        </div>
      )}

      {dropActive && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none',
          border: '3px dashed var(--bp-accent)', borderRadius: 12,
          background: 'var(--bp-accent)11', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--bp-accent)' }}>Déposez pour importer</span>
        </div>
      )}

      {viewing && <Lightbox photo={viewing} onClose={() => setViewing(null)} />}
    </div>
  )
}
