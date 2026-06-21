import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, TextArea, Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'
import LinksPanel from './LinksPanel.jsx'
import PhotosPanel from './PhotosPanel.jsx'

function EntityCard({ entity, onChange, canEdit }) {
  const [title, setTitle] = useState(entity.title || '')
  const [description, setDescription] = useState(entity.description || '')
  const [titleFocused, setTitleFocused] = useState(false)

  const save = useCallback(async () => {
    if (title === (entity.title || '') && description === (entity.description || '')) return
    await api.updateEntityItem(entity.id, { title, description })
    onChange()
  }, [entity.id, entity.title, entity.description, title, description, onChange])

  const remove = async () => {
    if (!confirm('Supprimer cette entité ?')) return
    await api.deleteEntityItem(entity.id)
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

      <TextArea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        onBlur={canEdit ? save : undefined}
        readOnly={!canEdit}
        rows={4}
        placeholder="Description…"
      />

      <LinksPanel type="entity" id={entity.id} />
      <PhotosPanel type="entity" id={entity.id} />
    </div>
  )
}

export default function EntitiesView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const isMobile = useIsMobile()
  const [entities, setEntities] = useState([])
  const [title, setTitle] = useState('')

  const load = useCallback(() => api.listEntityItems().then(setEntities), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['entities'])

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await api.createEntityItem({ title: title.trim(), description: '' })
    setTitle('')
    load()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Entités" />

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
            placeholder="Nom de l'entité…"
          />
          <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
            <Icons.plus style={{ width: 14, height: 14 }} />
            Ajouter
          </Btn>
        </form>
      )}

      {entities.length === 0 ? (
        <EmptyState
          icon={<Icons.grid style={{ width: '100%', height: '100%' }} />}
          text="Aucune entité enregistrée."
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
        }}>
          {entities.map((e) => (
            <EntityCard key={e.id} entity={e} onChange={load} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
