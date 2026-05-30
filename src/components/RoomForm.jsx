import { useState, useEffect } from 'react'
import { lookupRoom, KNOWN_ROOM_NAMES } from '../api/roomCatalog.js'

const EMPTY = {
  name: '', type: '', position: '', tableau_combo: '', tableau_combos: '',
  chess_pieces: '', objects: '', letters: '', days_seen: '', notes: '', gem_cost: '',
}

const FIELDS = [
  ['position', 'Position (ex: C3)', 'text'],
  ['gem_cost', 'Coût 💎 (gemmes)', 'text'],
  ['chess_pieces', "Pièces d'échecs", 'text'],
  ['objects', 'Objets trouvables', 'text'],
  ['letters', 'Lettres trouvées (ex: 3,7,12)', 'text'],
  ['days_seen', 'Jours vus (ex: 6,14)', 'text'],
]

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

  // Auto-remplissage depuis le catalogue quand le nom correspond exactement
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

  const submit = (e) => {
    e.preventDefault()
    const clean = combos.map((p) => [p[0].trim(), p[1].trim()]).filter((p) => p[0] || p[1])
    onSubmit({
      ...form,
      tableau_combos: JSON.stringify(clean),
      tableau_combo: clean.flat().filter(Boolean).join(', '),
    })
  }

  return (
    <form onSubmit={submit} className="bg-slate-800 rounded-xl p-5 space-y-3">
      <h3 className="font-bold text-lg">{initial?.id ? 'Modifier' : 'Nouvelle pièce'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">
            Nom de la pièce {matched && <span className="text-green-400">✓ auto-rempli</span>}
          </label>
          <input list="room-catalog" value={form.name} onChange={handleName} required
            placeholder="Tape le nom exact (auto type + 💎)"
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
          <datalist id="room-catalog">
            {KNOWN_ROOM_NAMES.map((n) => <option key={n} value={n} />)}
          </datalist>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Type</label>
          <select value={form.type} onChange={set('type')} className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5">
            {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        {FIELDS.map(([key, label, type]) => (
          <div key={key}>
            <label className="block text-xs text-slate-400 mb-1">{label}</label>
            <input type={type} value={form[key]} onChange={set(key)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
          </div>
        ))}
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Combinaisons de tableaux (2 combos de 2)</label>
        <div className="space-y-2">
          {[0, 1].map((ci) => (
            <div key={ci} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-16">Combo {ci + 1}</span>
              <input value={combos[ci][0]} onChange={setCombo(ci, 0)} placeholder="tableau A"
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
              <span className="text-slate-500">+</span>
              <input value={combos[ci][1]} onChange={setCombo(ci, 1)} placeholder="tableau B"
                className="flex-1 bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} rows={3}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">Enregistrer</button>
        {onCancel && <button type="button" onClick={onCancel} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded">Annuler</button>}
      </div>
    </form>
  )
}
