import { useState, useEffect, useRef } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { Input, Btn } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import TagPicker from './TagPicker.jsx'

// Popup d'attachement d'une photo à une entité (type/id).
// Deux modes : importer un nouveau fichier, ou piocher dans la photothèque.
// onAttached() est appelé après création du lien.
export default function PhotoAttachModal({ type, id, onClose, onAttached }) {
  const [mode, setMode] = useState('upload')
  const [library, setLibrary] = useState([])
  const [file, setFile] = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [tags, setTags] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const onDropFile = (e) => {
    e.preventDefault(); setDragOver(false)
    const img = Array.from(e.dataTransfer.files).find((f) => /^image\//.test(f.type))
    if (img) { setFile(img); setError('') }
  }

  const loadLibrary = () => api.listPhotos().then(setLibrary)
  useEffect(() => { loadLibrary() }, [])
  useWs((ch) => { if (ch === 'photos') loadLibrary() }, ['photos'])

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const link = async (photoId) => {
    await api.createLink({ from_type: type, from_id: id, to_type: 'photo', to_id: photoId })
    onAttached?.()
    onClose()
  }

  const importNew = async (e) => {
    e.preventDefault()
    if (!file || busy) return
    setBusy(true); setError('')
    try {
      const photo = await api.uploadPhoto(file, caption.trim(), tags)
      await link(photo.id)
    } catch (err) {
      setError(/413|stockage/i.test(String(err.message)) ? 'Limite de stockage atteinte.' : 'Échec de l\'import.')
      setBusy(false)
    }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: 'min(560px, 100%)', maxHeight: '85vh', display: 'flex', flexDirection: 'column',
        background: 'var(--bp-surface)', border: '1px solid var(--bp-border)',
        borderRadius: 10, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,.4)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--bp-border)',
        }}>
          <span style={{ fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--bp-text)' }}>
            Ajouter une photo
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)', padding: 2 }}>
            <Icons.close style={{ width: 18, height: 18 }} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: '12px 16px 0' }}>
          {[['upload', 'Importer'], ['library', 'Photothèque']].map(([m, lbl]) => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13,
              fontFamily: 'var(--font-body)', fontWeight: mode === m ? 600 : 400,
              background: mode === m ? 'var(--bp-accent)' : 'var(--bp-panel)',
              color: mode === m ? '#fff' : 'var(--bp-text-dim)',
            }}>{lbl}</button>
          ))}
        </div>

        <div style={{ padding: 16, overflow: 'auto' }}>
          {mode === 'upload' ? (
            <form onSubmit={importNew} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDropFile}
                style={{
                  border: `2px dashed ${dragOver ? 'var(--bp-accent)' : 'var(--bp-border)'}`,
                  borderRadius: 8, padding: preview ? 8 : 28,
                  textAlign: 'center', cursor: 'pointer',
                  background: dragOver ? 'var(--bp-accent)11' : 'var(--bp-bg)', transition: 'all .15s',
                }}>
                {preview ? (
                  <img src={preview} alt="" style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 6, display: 'block', margin: '0 auto' }} />
                ) : (
                  <div style={{ color: 'var(--bp-text-muted)', fontSize: 13 }}>
                    <Icons.photo style={{ width: 28, height: 28, display: 'block', margin: '0 auto 8px' }} />
                    Cliquez ou glissez une image ici
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                onChange={e => { setFile(e.target.files?.[0] || null); setError('') }} />
              <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="Légende (optionnel)" />
              <TagPicker value={tags} onChange={setTags} size="md" placeholder="Ajouter des tags…" />
              {error && <span style={{ color: '#E87070', fontSize: 12 }}>{error}</span>}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                <Btn type="button" variant="ghost" onClick={onClose}>Annuler</Btn>
                <Btn type="submit" variant="accent" disabled={!file || busy}>{busy ? 'Import…' : 'Importer & attacher'}</Btn>
              </div>
            </form>
          ) : library.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 8 }}>
              {library.map(p => (
                <button key={p.id} onClick={() => link(p.id)} title={p.caption || p.original_name || ''} style={{
                  padding: 0, border: '1px solid var(--bp-border)', borderRadius: 6, overflow: 'hidden',
                  cursor: 'pointer', background: 'var(--bp-bg)', aspectRatio: '1', position: 'relative',
                }}>
                  <img src={p.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--bp-text-muted)', fontSize: 13, textAlign: 'center', padding: 24 }}>
              La photothèque est vide. Importez une première photo.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
