import { useState } from 'react'

// Éditeur de tags : chips supprimables + saisie (Entrée ou virgule pour valider).
// value = array de chaînes ; onChange(nextArray).
export default function TagInput({ value = [], onChange, readOnly, placeholder = 'Ajouter un tag…', size = 'sm' }) {
  const [draft, setDraft] = useState('')
  const fz = size === 'sm' ? 10 : 12

  const commit = (raw) => {
    const t = raw.trim()
    if (!t || value.includes(t)) { setDraft(''); return }
    onChange([...value, t])
    setDraft('')
  }
  const remove = (t) => onChange(value.filter((x) => x !== t))

  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); commit(draft) }
    else if (e.key === 'Backspace' && !draft && value.length) remove(value[value.length - 1])
  }

  return (
    <div style={{
      display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center',
      padding: readOnly ? 0 : '2px 0',
    }}>
      {value.map((t) => (
        <span key={t} style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          padding: '1px 6px', borderRadius: 10, fontSize: fz,
          background: 'var(--bp-accent)22', color: 'var(--bp-accent)',
          border: '1px solid var(--bp-accent)44',
        }}>
          {t}
          {!readOnly && (
            <button onClick={() => remove(t)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'inherit',
              padding: 0, fontSize: fz + 2, lineHeight: 1,
            }}>×</button>
          )}
        </span>
      ))}
      {!readOnly && (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => commit(draft)}
          placeholder={value.length ? '' : placeholder}
          style={{
            flex: 1, minWidth: 70, background: 'transparent', border: 'none', outline: 'none',
            fontSize: fz + 1, color: 'var(--bp-text)', fontFamily: 'var(--font-body)',
          }}
        />
      )}
    </div>
  )
}
