import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { ENTITY_TYPES, meta } from '../api/entities.js'
import { Input, Select, Btn } from '../ui/primitives.jsx'

export default function LinksPanel({ type, id }) {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [links, setLinks] = useState([])
  const [entities, setEntities] = useState([])
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState('existing')
  const [target, setTarget] = useState('')
  const [label, setLabel] = useState('')
  const [newType, setNewType] = useState('person')
  const [newLabel, setNewLabel] = useState('')

  const load = useCallback(() => {
    if (id == null) return
    api.linksFor(type, id).then(setLinks)
  }, [type, id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (adding) api.listEntities().then(setEntities) }, [adding])
  useWs(load, ['links'])

  const add = async (e) => {
    e.preventDefault()
    let to_type, to_id
    if (mode === 'new') {
      if (!newLabel.trim()) return
      const created = await api.createEntity(newType, newLabel.trim())
      to_type = created.type; to_id = created.id
    } else {
      if (!target) return
      const [t, i] = target.split('::')
      to_type = t; to_id = Number(i)
    }
    await api.createLink({ from_type: type, from_id: id, to_type, to_id, label })
    setTarget(''); setLabel(''); setNewLabel(''); setAdding(false); setMode('existing')
    load()
  }

  const remove = async (linkId) => { await api.deleteLink(linkId); load() }
  const options = entities.filter((e) => !(e.type === type && String(e.id) === String(id)))

  const etLabel = (t) => {
    const m = meta(t)
    return m.label
  }

  return (
    <div style={{
      padding: 10, borderRadius: 6, background: 'var(--bp-bg)',
      border: '1px solid var(--bp-border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bp-text-dim)' }}>Liens</span>
        {canEdit && (
          <button onClick={() => setAdding(!adding)} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-accent)', fontSize: 11,
          }}>{adding ? '×' : '+ lien'}</button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
          <div style={{ display: 'flex', gap: 4, fontSize: 11 }}>
            <button type="button" onClick={() => setMode('existing')} style={{
              padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
              background: mode === 'existing' ? 'var(--bp-accent)' : 'var(--bp-panel)',
              color: mode === 'existing' ? '#fff' : 'var(--bp-text-dim)',
            }}>Existant</button>
            <button type="button" onClick={() => setMode('new')} style={{
              padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer', fontSize: 11,
              background: mode === 'new' ? 'var(--bp-accent)' : 'var(--bp-panel)',
              color: mode === 'new' ? '#fff' : 'var(--bp-text-dim)',
            }}>Nouveau</button>
          </div>
          {mode === 'existing' ? (
            <Select value={target} onChange={e => setTarget(e.target.value)}
              style={{ padding: '4px 8px', fontSize: 11 }}>
              <option value="">— relier à —</option>
              {ENTITY_TYPES.map(et => {
                const ents = options.filter(e => e.type === et)
                if (!ents.length) return null
                return (
                  <optgroup key={et} label={meta(et).label}>
                    {ents.map(e => <option key={`${e.type}::${e.id}`} value={`${e.type}::${e.id}`}>{e.label}</option>)}
                  </optgroup>
                )
              })}
            </Select>
          ) : (
            <div style={{ display: 'flex', gap: 4 }}>
              <Select value={newType} onChange={e => setNewType(e.target.value)}
                style={{ width: 100, padding: '4px 8px', fontSize: 11 }}>
                {ENTITY_TYPES.map(t => <option key={t} value={t}>{meta(t).label}</option>)}
              </Select>
              <Input value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder={newType === 'day' ? 'n° du jour' : 'nom / valeur'}
                style={{ padding: '4px 8px', fontSize: 11 }} />
            </div>
          )}
          <div style={{ display: 'flex', gap: 4 }}>
            <Input value={label} onChange={e => setLabel(e.target.value)}
              placeholder="label (optionnel)" style={{ padding: '4px 8px', fontSize: 11 }}
              onKeyDown={e => e.key === 'Enter' && add(e)} />
            <Btn small variant="accent" onClick={add} style={{ padding: '4px 8px', fontSize: 11 }}>OK</Btn>
          </div>
        </form>
      )}

      {links.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {links.map(l => (
            <div key={l.id} style={{
              display: 'flex', alignItems: 'center', gap: 6, fontSize: 11,
              padding: '3px 6px', borderRadius: 4, background: 'var(--bp-surface)',
            }}>
              <span style={{ color: 'var(--bp-text-muted)', fontSize: 9, flexShrink: 0 }}>{etLabel(l.other_type)}</span>
              <span style={{ flex: 1, color: 'var(--bp-text)', fontWeight: 500 }}>{l.other_label}</span>
              {l.label && <span style={{ color: 'var(--bp-text-muted)', fontStyle: 'italic' }}>{l.label}</span>}
              {canEdit && (
                <button onClick={() => remove(l.id)} style={{
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)',
                  padding: 0, fontSize: 12, lineHeight: 1,
                }}>×</button>
              )}
            </div>
          ))}
        </div>
      ) : (
        !adding && <span style={{ fontSize: 10, color: 'var(--bp-text-muted)' }}>Aucun lien</span>
      )}
    </div>
  )
}
