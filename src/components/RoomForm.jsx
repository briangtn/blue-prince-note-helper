import { useState, useEffect } from 'react'
import { lookupRoom } from '../api/roomCatalog.js'
import { Input, TextArea, Select, Btn, ChessPieceSelector } from '../ui/primitives.jsx'

const EMPTY = {
  name: '', type: '', position: '', tableau_combo: '', tableau_combos: '',
  chess_pieces: '', objects: '', letters: '', notes: '', gem_cost: '',
}

const parseCombos = (json) => {
  try {
    const a = JSON.parse(json || '[]')
    return [
      [a[0]?.[0] || '', a[0]?.[1] || ''],
      [a[1]?.[0] || '', a[1]?.[1] || ''],
    ]
  } catch {
    return [['', ''], ['', '']]
  }
}

export default function RoomForm({ types, initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  const [combos, setCombos] = useState([['', ''], ['', '']])

  useEffect(() => {
    setForm(initial ? { ...EMPTY, ...initial } : { ...EMPTY, type: types[0]?.name || '' })
    setCombos(parseCombos(initial?.tableau_combos))
  }, [initial, types])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const [matched, setMatched] = useState(false)
  const handleName = (e) => {
    const value = e.target.value
    const hit = lookupRoom(value)
    setForm((f) => {
      const next = { ...f, name: value }
      if (hit) {
        next.name = hit.name
        next.type = hit.type
        if (hit.gem != null) next.gem_cost = String(hit.gem)
      }
      return next
    })
    setMatched(!!hit)
  }

  const setCombo = (ci, pi) => (e) => {
    setCombos((c) => {
      const next = c.map((pair) => [...pair])
      next[ci][pi] = e.target.value
      return next
    })
  }

  const [error, setError] = useState('')
  const submit = (e) => {
    e.preventDefault()
    if (!lookupRoom(form.name)) {
      setError('Salle inconnue du catalogue')
      return
    }
    setError('')
    const clean = combos.map((p) => [p[0].trim(), p[1].trim()]).filter((p) => p[0] || p[1])
    onSubmit({
      ...form,
      tableau_combos: JSON.stringify(clean),
      tableau_combo: clean.flat().filter(Boolean).join(', '),
    })
  }

  return (
    <form onSubmit={submit} style={{
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600 }}>
        {initial?.id ? `Éditer — ${initial.name}` : 'Nouvelle pièce'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>
            Nom {matched && <span style={{ color: '#5BAD6E' }}>auto-rempli</span>}
          </label>
          <Input value={form.name} onChange={handleName} required placeholder="Nom de la pièce" />
          {error && <div style={{ fontSize: 11, color: '#C85454', marginTop: 4 }}>{error}</div>}
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
          <Select value={form.type} onChange={set('type')}>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </Select>
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Position</label>
          <Input value={form.position || ''} onChange={set('position')} placeholder="ex: C3" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Coût gemmes</label>
          <Input type="number" value={form.gem_cost} onChange={set('gem_cost')} placeholder="0" />
        </div>
        <div style={{ gridColumn: '1 / -1' }}>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Pièce d'échecs</label>
          <ChessPieceSelector value={form.chess_pieces || ''} onChange={(v) => setForm(f => ({ ...f, chess_pieces: v }))} />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Objets</label>
          <Input value={form.objects || ''} onChange={set('objects')} placeholder="Clé, Pelle…" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Lettres</label>
          <Input value={form.letters || ''} onChange={set('letters')} placeholder="3,7,12" />
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Paires de tableaux</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[0, 1].map((ci) => (
            <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 10, color: 'var(--bp-text-muted)', width: 50 }}>Combo {ci + 1}</span>
              <Input value={combos[ci][0]} onChange={setCombo(ci, 0)} placeholder="tableau A"
                style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
              <span style={{ color: 'var(--bp-text-muted)', fontSize: 11 }}>/</span>
              <Input value={combos[ci][1]} onChange={setCombo(ci, 1)} placeholder="tableau B"
                style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
        <TextArea rows={3} value={form.notes || ''} onChange={set('notes')} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="accent" onClick={submit}>Enregistrer</Btn>
        {onCancel && <Btn onClick={onCancel}>Annuler</Btn>}
      </div>
    </form>
  )
}
