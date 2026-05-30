import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import LinksPanel from './LinksPanel.jsx'

const EMPTY = { name: '', role: '', day_met: '', status: '', notes: '' }

export default function PeopleView() {
  const [people, setPeople] = useState([])
  const [editing, setEditing] = useState(null)
  const [q, setQ] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDay, setFilterDay] = useState('')

  const load = useCallback(() => api.listPeople().then(setPeople), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['people', 'links'])

  const save = async (form) => {
    const body = { ...form, day_met: form.day_met ? Number(form.day_met) : null }
    if (editing?.id) await api.updatePerson(editing.id, body)
    else await api.createPerson(body)
    setEditing(null)
    load()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette personne (et ses liens) ?')) return
    await api.deletePerson(id)
    load()
  }

  const statuses = [...new Set(people.map((p) => p.status).filter(Boolean))].sort()
  const days = [...new Set(people.map((p) => p.day_met).filter((d) => d != null))].sort((a, b) => a - b)

  const filtered = people.filter((p) => {
    if (q) {
      const lower = q.toLowerCase()
      if (!(p.name?.toLowerCase().includes(lower) || p.role?.toLowerCase().includes(lower) || p.notes?.toLowerCase().includes(lower))) return false
    }
    if (filterStatus && p.status !== filterStatus) return false
    if (filterDay && p.day_met !== Number(filterDay)) return false
    return true
  })

  return (
    <div className="max-w-4xl mx-auto p-6 h-full overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">👥 Personnes</h2>
        <button onClick={() => setEditing({})} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">
          + Personne
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, rôle, notes)…"
          className="flex-1 min-w-[200px] bg-slate-800 border border-slate-600 rounded px-3 py-2" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2">
          <option value="">Tous statuts</option>
          {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={filterDay} onChange={(e) => setFilterDay(e.target.value)}
          className="bg-slate-800 border border-slate-600 rounded px-3 py-2">
          <option value="">Tous jours</option>
          {days.map((d) => <option key={d} value={d}>Days {String(d).padStart(2, '0')}</option>)}
        </select>
        {(q || filterStatus || filterDay) && (
          <button onClick={() => { setQ(''); setFilterStatus(''); setFilterDay('') }}
            className="text-slate-400 hover:text-slate-200 px-2">✕ Reset</button>
        )}
        <span className="text-sm text-slate-500 self-center">{filtered.length}/{people.length}</span>
      </div>

      {editing !== null && <PersonForm initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {filtered.map((p) => (
          <div key={p.id} className="bg-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold text-lg">{p.name}</div>
                {p.role && <div className="text-sm text-slate-400">{p.role}</div>}
                <div className="flex gap-3 text-xs text-slate-500 mt-1">
                  {p.day_met != null && <span>Rencontré: Days {String(p.day_met).padStart(2, '0')}</span>}
                  {p.status && <span>Statut: {p.status}</span>}
                </div>
              </div>
              <div className="flex gap-2 text-sm">
                <button onClick={() => setEditing(p)} className="text-cyan-400 hover:text-cyan-300">Éditer</button>
                <button onClick={() => remove(p.id)} className="text-red-400 hover:text-red-300">Suppr</button>
              </div>
            </div>
            {p.notes && <p className="text-sm text-slate-300 whitespace-pre-wrap">{p.notes}</p>}
            <LinksPanel type="person" id={p.id} />
          </div>
        ))}
        {filtered.length === 0 && <p className="text-slate-500">Aucune personne pour ces filtres.</p>}
      </div>
    </div>
  )
}

function PersonForm({ initial, onSubmit, onCancel }) {
  const [form, setForm] = useState(EMPTY)
  useEffect(() => { setForm({ ...EMPTY, ...initial, day_met: initial?.day_met ?? '' }) }, [initial])
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(form) }} className="bg-slate-800 rounded-xl p-5 space-y-3">
      <h3 className="font-bold">{initial?.id ? 'Modifier' : 'Nouvelle personne'}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-slate-400 mb-1">Nom</label>
          <input value={form.name} onChange={set('name')} required
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Rôle / description</label>
          <input value={form.role} onChange={set('role')}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Jour rencontré (n°)</label>
          <input type="number" value={form.day_met} onChange={set('day_met')}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-1">Statut</label>
          <input value={form.status} onChange={set('status')}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
        </div>
      </div>
      <div>
        <label className="block text-xs text-slate-400 mb-1">Notes</label>
        <textarea value={form.notes} onChange={set('notes')} rows={2}
          className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5" />
      </div>
      <div className="flex gap-2">
        <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">Enregistrer</button>
        <button type="button" onClick={onCancel} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded">Annuler</button>
      </div>
    </form>
  )
}
