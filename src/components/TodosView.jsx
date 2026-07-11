import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, Btn, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'

function TodoRow({ todo, onChange, canEdit }) {
  const [text, setText] = useState(todo.text || '')
  const done = !!todo.done

  useEffect(() => { setText(todo.text || '') }, [todo.text])

  const toggle = async () => {
    if (!canEdit) return
    await api.updateTodo(todo.id, { done: done ? 0 : 1 })
    onChange()
  }

  const saveText = async () => {
    const t = text.trim()
    if (t === (todo.text || '')) return
    if (!t) { setText(todo.text || ''); return }
    await api.updateTodo(todo.id, { text: t })
    onChange()
  }

  const remove = async () => {
    if (!confirm('Supprimer cette tâche ?')) return
    await api.deleteTodo(todo.id)
    onChange()
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: 'var(--bp-surface)', borderRadius: 8,
      border: '1px solid var(--bp-border)', padding: '8px 12px',
    }}>
      <button
        onClick={toggle}
        disabled={!canEdit}
        title={done ? 'Marquer à faire' : 'Marquer terminé'}
        style={{
          width: 20, height: 20, flexShrink: 0, borderRadius: 5, padding: 0,
          border: done ? '1px solid var(--bp-accent)' : '1px solid var(--bp-border)',
          background: done ? 'var(--bp-accent)' : 'transparent',
          cursor: canEdit ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        {done && <Icons.tick style={{ width: 13, height: 13, color: '#fff' }} />}
      </button>

      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={canEdit ? saveText : undefined}
        onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
        readOnly={!canEdit}
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--bp-text)',
          textDecoration: done ? 'line-through' : 'none',
          opacity: done ? 0.55 : 1, cursor: canEdit ? 'text' : 'default',
          padding: '2px 0',
        }}
      />

      {canEdit && (
        <button onClick={remove} title="Supprimer" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'inline-flex', alignItems: 'center', padding: 4, flexShrink: 0,
        }}>
          <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
        </button>
      )}
    </div>
  )
}

const FILTERS = [
  { id: 'all', label: 'Toutes' },
  { id: 'active', label: 'À faire' },
  { id: 'done', label: 'Terminées' },
]

export default function TodosView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const isMobile = useIsMobile()
  const [todos, setTodos] = useState([])
  const [text, setText] = useState('')
  const [filter, setFilter] = useState('all')

  const load = useCallback(() => api.listTodos().then(setTodos), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['todos'])

  const add = async (e) => {
    e.preventDefault()
    if (!text.trim()) return
    await api.createTodo({ text: text.trim() })
    setText('')
    load()
  }

  const remaining = todos.filter((t) => !t.done).length
  const shown = todos.filter((t) =>
    filter === 'all' ? true : filter === 'active' ? !t.done : !!t.done
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Tâches">
        <span style={{ fontSize: 13, color: 'var(--bp-text-muted)' }}>{remaining} à faire</span>
      </SectionHead>

      {canEdit && (
        <form onSubmit={add} style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Nouvelle tâche…" />
          <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
            <Icons.plus style={{ width: 14, height: 14 }} />
            Ajouter
          </Btn>
        </form>
      )}

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
            fontSize: 12, fontFamily: 'var(--font-body)',
            background: filter === f.id ? 'var(--bp-accent)' : 'var(--bp-panel)',
            color: filter === f.id ? '#fff' : 'var(--bp-text-dim)',
          }}>{f.label}</button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          icon={<Icons.check style={{ width: '100%', height: '100%' }} />}
          text={todos.length === 0 ? 'Aucune tâche.' : 'Rien à afficher pour ce filtre.'}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {shown.map((t) => (
            <TodoRow key={t.id} todo={t} onChange={load} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  )
}
