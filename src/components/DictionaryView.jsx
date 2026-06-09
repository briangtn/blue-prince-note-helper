import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, TextArea, Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'

function EntryCard({ entry, onChange, canEdit }) {
  const [term, setTerm] = useState(entry.term || '')
  const [definition, setDefinition] = useState(entry.definition || '')
  const [termFocused, setTermFocused] = useState(false)

  const save = useCallback(async () => {
    if (term === (entry.term || '') && definition === (entry.definition || '')) return
    await api.updateDictionaryEntry(entry.id, { term, definition })
    onChange()
  }, [entry.id, entry.term, entry.definition, term, definition, onChange])

  const remove = async () => {
    if (!confirm('Supprimer cette entrée ?')) return
    await api.deleteDictionaryEntry(entry.id)
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
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setTermFocused(true)}
          onBlur={() => { setTermFocused(false); if (canEdit) save() }}
          readOnly={!canEdit}
          placeholder="Terme…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: termFocused ? '1px solid var(--bp-accent)' : '1px solid transparent',
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
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--bp-text-muted)', display: 'inline-flex',
              alignItems: 'center', padding: 4, borderRadius: 4, flexShrink: 0,
            }}
          >
            <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
          </button>
        )}
      </div>

      <TextArea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        onBlur={canEdit ? save : undefined}
        readOnly={!canEdit}
        rows={3}
        placeholder="Définition…"
      />
    </div>
  )
}

export default function DictionaryView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [entries, setEntries] = useState([])
  const [term, setTerm] = useState('')
  const [query, setQuery] = useState('')

  const load = useCallback(() => api.listDictionary().then(setEntries), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['dictionary'])

  const add = async (e) => {
    e.preventDefault()
    if (!term.trim()) return
    await api.createDictionaryEntry({ term: term.trim(), definition: '' })
    setTerm('')
    load()
  }

  const q = query.trim().toLowerCase()
  const filtered = q
    ? entries.filter((e) =>
        (e.term || '').toLowerCase().includes(q) ||
        (e.definition || '').toLowerCase().includes(q))
    : entries

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 28px' }}>
      <SectionHead title="Dictionnaire" />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        {canEdit && (
          <form onSubmit={add} style={{ display: 'flex', gap: 10, flex: 1, minWidth: 280, maxWidth: 500 }}>
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Nouveau terme…"
            />
            <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
              <Icons.plus style={{ width: 14, height: 14 }} />
              Ajouter
            </Btn>
          </form>
        )}
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher…"
          style={{ maxWidth: 240 }}
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icons.book style={{ width: '100%', height: '100%' }} />}
          text={q ? 'Aucun résultat.' : 'Aucune entrée dans le dictionnaire.'}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
        }}>
          {filtered.map((e) => (
            <EntryCard key={e.id} entry={e} onChange={load} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
