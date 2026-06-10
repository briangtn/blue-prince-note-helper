import { useState, useRef, useEffect } from 'react'
import { useTags } from '../api/useTags.js'
import { tagTextColor } from '../api/tagColors.js'

// Pastille colorée (label GitHub).
export function TagPill({ name, color, onRemove, size = 'sm' }) {
  const fz = size === 'sm' ? 10 : 12
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: size === 'sm' ? '1px 8px' : '2px 10px', borderRadius: 999, fontSize: fz, fontWeight: 600,
      background: color, color: tagTextColor(color), lineHeight: 1.5, whiteSpace: 'nowrap',
    }}>
      {name}
      {onRemove && (
        <button onClick={(e) => { e.stopPropagation(); onRemove() }} style={{
          background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
          padding: 0, fontSize: fz + 3, lineHeight: 1, opacity: 0.8,
        }}>×</button>
      )}
    </span>
  )
}

// Sélecteur de tags type "labels GitHub" : pastilles colorées + menu déroulant
// (recherche, liste des tags existants cliquables, création si inédit).
export default function TagPicker({ value = [], onChange, readOnly, size = 'sm', placeholder = 'Ajouter un tag…' }) {
  const { tags, colorOf, ensure } = useTags()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const wrapRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) { setOpen(false); setSearch('') } }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const add = async (name) => {
    const t = name.trim()
    if (!t) return
    if (!value.includes(t)) { await ensure(t); onChange([...value, t]) }
    setSearch('')
    inputRef.current?.focus()
  }
  const toggle = (name) => value.includes(name) ? onChange(value.filter((x) => x !== name)) : add(name)
  const remove = (name) => onChange(value.filter((x) => x !== name))

  const q = search.trim().toLowerCase()
  const filtered = tags.filter((t) => !q || t.name.toLowerCase().includes(q))
  const exact = tags.some((t) => t.name.toLowerCase() === q)
  const canCreate = q.length > 0 && !exact

  if (readOnly) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {value.map((n) => <TagPill key={n} name={n} color={colorOf(n)} size={size} />)}
      </div>
    )
  }

  return (
    <div ref={wrapRef} style={{ position: 'relative' }}>
      <div onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }} style={{
        display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
        minHeight: 24, cursor: 'text',
      }}>
        {value.map((n) => <TagPill key={n} name={n} color={colorOf(n)} size={size} onRemove={() => remove(n)} />)}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--bp-accent)', fontSize: size === 'sm' ? 10 : 12 }}>
          <span style={{ fontSize: size === 'sm' ? 13 : 15, lineHeight: 1 }}>+</span>
          {value.length === 0 && <span style={{ color: 'var(--bp-text-muted)' }}>{placeholder}</span>}
        </span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, marginTop: 4, zIndex: 200,
          width: 220, maxHeight: 260, display: 'flex', flexDirection: 'column',
          background: 'var(--bp-surface)', border: '1px solid var(--bp-border)',
          borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,.25)', overflow: 'hidden',
        }}>
          <input
            ref={inputRef} value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); if (q) add(search) }
              else if (e.key === 'Escape') { setOpen(false); setSearch('') }
              else if (e.key === 'Backspace' && !search && value.length) remove(value[value.length - 1])
            }}
            placeholder="Filtrer ou créer un tag…"
            style={{
              padding: '8px 10px', border: 'none', borderBottom: '1px solid var(--bp-border)',
              outline: 'none', background: 'var(--bp-bg)', color: 'var(--bp-text)', fontSize: 12,
              fontFamily: 'var(--font-body)',
            }} />
          <div style={{ overflow: 'auto' }}>
            {filtered.map((t) => {
              const on = value.includes(t.name)
              return (
                <button key={t.id ?? t.name} onClick={() => toggle(t.name)} style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left',
                  padding: '6px 10px', border: 'none', cursor: 'pointer',
                  background: on ? 'var(--bp-panel)' : 'transparent', fontSize: 12, color: 'var(--bp-text)',
                }}>
                  <span style={{ width: 12, fontSize: 11, color: 'var(--bp-accent)' }}>{on ? '✓' : ''}</span>
                  <span style={{ width: 12, height: 12, borderRadius: 3, background: t.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</span>
                </button>
              )
            })}
            {canCreate && (
              <button onClick={() => add(search)} style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%', textAlign: 'left',
                padding: '6px 10px', border: 'none', borderTop: filtered.length ? '1px solid var(--bp-border)' : 'none',
                cursor: 'pointer', background: 'transparent', fontSize: 12, color: 'var(--bp-text-dim)',
              }}>
                <span style={{ fontSize: 13, color: 'var(--bp-accent)' }}>+</span>
                Créer le tag «&nbsp;{search.trim()}&nbsp;»
              </button>
            )}
            {!filtered.length && !canCreate && (
              <div style={{ padding: '8px 10px', fontSize: 11, color: 'var(--bp-text-muted)' }}>Aucun tag</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
