import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, TextArea, Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'
import LinksPanel from './LinksPanel.jsx'
import PhotosPanel from './PhotosPanel.jsx'

function NoteCard({ note, onChange, canEdit }) {
  const [title, setTitle] = useState(note.title || '')
  const [body, setBody] = useState(note.body || '')
  const [titleFocused, setTitleFocused] = useState(false)

  const save = useCallback(async () => {
    if (title === (note.title || '') && body === (note.body || '')) return
    await api.updateNote(note.id, { title, body })
    onChange()
  }, [note.id, note.title, note.body, title, body, onChange])

  const remove = async () => {
    if (!confirm('Supprimer cette note ?')) return
    await api.deleteNote(note.id)
    onChange()
  }

  return (
    <div style={{
      background: 'var(--bp-surface)',
      borderRadius: 10,
      border: '1px solid var(--bp-border)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onFocus={() => setTitleFocused(true)}
          onBlur={() => { setTitleFocused(false); if (canEdit) save() }}
          readOnly={!canEdit}
          placeholder="Titre…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: titleFocused
              ? '1px solid var(--bp-accent)'
              : '1px solid transparent',
            outline: 'none',
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--bp-text)',
            padding: '2px 0',
            cursor: canEdit ? 'text' : 'default',
          }}
        />
        {canEdit && (
          <button
            onClick={remove}
            title="Supprimer"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--bp-text-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              padding: 4,
              borderRadius: 4,
              flexShrink: 0,
            }}
          >
            <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
          </button>
        )}
      </div>

      {/* Body */}
      <TextArea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onBlur={canEdit ? save : undefined}
        readOnly={!canEdit}
        rows={4}
        placeholder="Contenu de la note…"
      />

      {/* Links */}
      <LinksPanel type="note" id={note.id} />
      <PhotosPanel type="note" id={note.id} />
    </div>
  )
}

export default function NotesView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const isMobile = useIsMobile()
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')

  const load = useCallback(() => api.listNotes().then(setNotes), [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await api.createNote({ title: title.trim(), body: '' })
    setTitle('')
    load()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px' }}>
      <SectionHead title="Notes" />

      {/* Add form */}
      {canEdit && (
        <form onSubmit={add} style={{
          display: 'flex',
          gap: 10,
          maxWidth: 500,
          marginBottom: 20,
        }}>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Titre de la note…"
          />
          <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
            <Icons.plus style={{ width: 14, height: 14 }} />
            Ajouter
          </Btn>
        </form>
      )}

      {/* Notes grid */}
      {notes.length === 0 ? (
        <EmptyState
          icon={<Icons.note style={{ width: '100%', height: '100%' }} />}
          text="Aucune note enregistrée."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
        }}>
          {notes.map((n) => (
            <NoteCard key={n.id} note={n} onChange={load} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
