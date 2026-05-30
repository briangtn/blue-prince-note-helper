import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import RoomForm from './RoomForm.jsx'
import LinksPanel from './LinksPanel.jsx'

const DETAIL_FIELDS = [
  ['position', 'Position'],
  ['chess_pieces', "Pièces d'échecs"],
  ['objects', 'Objets'],
  ['letters', 'Lettres'],
  ['days_seen', 'Jours vus'],
]

const renderCombos = (json) => {
  try {
    const combos = JSON.parse(json || '[]').filter((p) => p[0] || p[1])
    if (!combos.length) return null
    return combos.map((p, i) => (
      <span key={i} className="inline-block bg-slate-700 rounded px-2 py-0.5 mr-1 text-xs">
        {[p[0], p[1]].filter(Boolean).join(' + ')}
      </span>
    ))
  } catch {
    return null
  }
}

export default function RoomsView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [types, setTypes] = useState([])
  const [rooms, setRooms] = useState([])
  const [filterType, setFilterType] = useState('')
  const [q, setQ] = useState('')
  const [editing, setEditing] = useState(null)
  const [newType, setNewType] = useState('')

  const loadTypes = useCallback(() => api.listTypes().then(setTypes), [])
  const loadRooms = useCallback(() => api.listRooms({ type: filterType, q }).then(setRooms), [filterType, q])

  useEffect(() => { loadTypes() }, [loadTypes])
  useEffect(() => { loadRooms() }, [loadRooms])
  useWs(() => { loadTypes(); loadRooms() }, ['rooms'])

  const colorFor = (name) => types.find((t) => t.name === name)?.color || '#64748b'

  const save = async (form) => {
    if (editing?.id) await api.updateRoom(editing.id, form)
    else await api.createRoom(form)
    setEditing(null)
    loadRooms()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette pièce ?')) return
    await api.deleteRoom(id)
    loadRooms()
  }

  const addType = async (e) => {
    e.preventDefault()
    if (!newType.trim()) return
    await api.createType({ name: newType.trim() })
    setNewType('')
    loadTypes()
  }

  return (
    <div className="flex h-full">
      {/* Sidebar types */}
      <aside className="w-56 bg-slate-800/50 p-4 overflow-y-auto shrink-0">
        <h3 className="font-bold mb-3">Types</h3>
        <button onClick={() => setFilterType('')}
          className={`block w-full text-left px-3 py-1.5 rounded mb-1 ${!filterType ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}>
          Toutes
        </button>
        {types.map((t) => (
          <button key={t.id} onClick={() => setFilterType(t.name)}
            className={`flex items-center gap-2 w-full text-left px-3 py-1.5 rounded mb-1 ${filterType === t.name ? 'bg-slate-700' : 'hover:bg-slate-700/50'}`}>
            <span className="w-3 h-3 rounded-full" style={{ background: t.color }} />
            {t.name}
          </button>
        ))}
        {canEdit && (
          <form onSubmit={addType} className="mt-4 flex gap-1">
            <input value={newType} onChange={(e) => setNewType(e.target.value)} placeholder="Nouveau type"
              className="flex-1 min-w-0 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm" />
            <button className="bg-cyan-600 hover:bg-cyan-500 px-2 rounded text-sm">+</button>
          </form>
        )}
      </aside>

      {/* Main */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="flex items-center gap-3 mb-5">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher (nom, notes, objets)…"
            className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2" />
          {canEdit && (
            <button onClick={() => setEditing({})} className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium whitespace-nowrap">
              + Pièce
            </button>
          )}
        </div>

        {editing !== null && (
          <div className="mb-5">
            <RoomForm types={types} initial={editing} onSubmit={save} onCancel={() => setEditing(null)} />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {rooms.map((r) => (
            <div key={r.id} className="bg-slate-800 rounded-xl p-4 border-l-4" style={{ borderColor: colorFor(r.type) }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-lg">{r.name}</div>
                  <div className="text-xs" style={{ color: colorFor(r.type) }}>{r.type}</div>
                </div>
                {canEdit && (
                  <div className="flex gap-2 text-sm">
                    <button onClick={() => setEditing(r)} className="text-cyan-400 hover:text-cyan-300">Éditer</button>
                    <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-300">Suppr</button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-3 text-sm">
                {r.gem_cost != null && r.gem_cost !== '' && (
                  <div><span className="text-slate-500">Coût: </span>💎 {r.gem_cost}</div>
                )}
                {DETAIL_FIELDS.map(([k, label]) => r[k] && (
                  <div key={k}><span className="text-slate-500">{label}: </span>{r[k]}</div>
                ))}
              </div>
              {renderCombos(r.tableau_combos) && (
                <div className="mt-2 text-sm"><span className="text-slate-500">Tableaux: </span>{renderCombos(r.tableau_combos)}</div>
              )}
              {r.notes && <p className="mt-2 text-sm text-slate-300 whitespace-pre-wrap">{r.notes}</p>}
              <div className="mt-3"><LinksPanel type="room" id={r.id} /></div>
            </div>
          ))}
          {rooms.length === 0 && <p className="text-slate-500">Aucune pièce pour ce filtre.</p>}
        </div>
      </main>
    </div>
  )
}
