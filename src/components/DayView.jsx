import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client.js'
import { formatGameDate } from '../api/gameDate.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import LinksPanel from './LinksPanel.jsx'

const ROWS = 9
const COLS = 5
// Cases fixes du manoir
const ANTECHAMBER = { row: 0, col: 2 }
const ENTRANCE = { row: ROWS - 1, col: 2 }
const isFixed = (r, c) =>
  (r === ANTECHAMBER.row && c === ANTECHAMBER.col) || (r === ENTRANCE.row && c === ENTRANCE.col)

export default function DayView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [days, setDays] = useState([])
  const [current, setCurrent] = useState(() => {
    const v = localStorage.getItem('bp_current_day')
    return v ? Number(v) : null
  })
  const [placements, setPlacements] = useState([])
  const [overall, setOverall] = useState('')
  const [types, setTypes] = useState([])
  const [rooms, setRooms] = useState([])
  const [cell, setCell] = useState(null) // {row, col, existing}
  const notesTimer = useRef(null)

  const loadDays = useCallback(() => api.listDays().then(setDays), [])
  const loadCatalog = useCallback(() => {
    api.listTypes().then(setTypes)
    api.listRooms().then(setRooms)
  }, [])

  useEffect(() => { loadDays(); loadCatalog() }, [loadDays, loadCatalog])
  useWs(() => { loadDays(); loadCatalog(); loadDay(current) }, ['days', 'rooms'])

  const loadDay = useCallback((n) => {
    if (n == null) return
    api.getDay(n).then(({ day, placements }) => {
      setPlacements(placements)
      setOverall(day.overall_notes || '')
    })
  }, [])

  useEffect(() => { loadDay(current) }, [current, loadDay])

  const colorFor = (typeName) => types.find((t) => t.name === typeName)?.color || '#64748b'
  const placementAt = (r, c) => placements.find((p) => p.row === r && p.col === c)

  const startDay = async () => {
    const input = prompt('Numéro du jour (Days XX) :')
    const n = parseInt(input, 10)
    if (!n || n < 1) return
    await api.startDay(n)
    localStorage.setItem('bp_current_day', String(n))
    setCurrent(n)
    loadDays()
  }

  const switchDay = (n) => {
    localStorage.setItem('bp_current_day', String(n))
    setCurrent(n)
  }

  const onNotesChange = (e) => {
    setOverall(e.target.value)
    clearTimeout(notesTimer.current)
    const val = e.target.value
    notesTimer.current = setTimeout(() => api.updateDayNotes(current, val), 500)
  }

  const savePlacement = async ({ room_id, note }) => {
    await api.setPlacement(current, { row: cell.row, col: cell.col, room_id, note })
    setCell(null)
    loadDay(current)
    loadCatalog() // days_seen mis à jour
  }

  const clearCell = async () => {
    await api.removePlacement(current, { row: cell.row, col: cell.col })
    setCell(null)
    loadDay(current)
  }

  if (current == null) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-slate-400">Aucun jour en cours.</p>
        {canEdit && (
          <button onClick={startDay} className="bg-cyan-600 hover:bg-cyan-500 px-6 py-3 rounded-lg font-semibold text-lg">
            ▶ Commencer un jour
          </button>
        )}
        {days.length > 0 && (
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-2">ou reprendre un jour :</p>
            <div className="flex flex-wrap gap-2 justify-center max-w-md">
              {days.map((d) => (
                <button key={d.day_number} onClick={() => switchDay(d.day_number)}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded">
                  Days {String(d.day_number).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="flex h-full">
      <main className="flex-1 p-6 overflow-auto">
        <div className="flex items-center gap-4 mb-1">
          <h2 className="text-2xl font-bold">Days {String(current).padStart(2, '0')}</h2>
          <span className="text-cyan-300 capitalize">{formatGameDate(current)}</span>
        </div>
        <div className="flex items-center gap-2 mb-5">
          <select value={current} onChange={(e) => switchDay(Number(e.target.value))}
            className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm">
            {days.map((d) => (
              <option key={d.day_number} value={d.day_number}>Days {String(d.day_number).padStart(2, '0')}</option>
            ))}
          </select>
          {canEdit && (
            <button onClick={startDay} className="bg-cyan-600 hover:bg-cyan-500 px-3 py-1 rounded text-sm font-medium">
              ▶ Nouveau jour
            </button>
          )}
        </div>

        {/* Grille du manoir */}
        <div className="inline-grid gap-1.5 bg-slate-900/50 p-3 rounded-xl"
          style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const fixedAnte = r === ANTECHAMBER.row && c === ANTECHAMBER.col
              const fixedEnt = r === ENTRANCE.row && c === ENTRANCE.col
              const p = placementAt(r, c)
              if (fixedAnte || fixedEnt) {
                return (
                  <div key={`${r}-${c}`}
                    className="w-24 h-20 rounded-lg flex items-center justify-center text-center text-xs font-semibold bg-slate-700 border border-slate-500 px-1">
                    {fixedAnte ? '🔺 Antechamber' : '🚪 Entrance Hall'}
                  </div>
                )
              }
              return (
                <button key={`${r}-${c}`} onClick={canEdit ? () => setCell({ row: r, col: c, existing: p }) : undefined}
                  className={`w-24 h-20 rounded-lg flex items-center justify-center text-center text-xs px-1 border transition
                    border-slate-700 ${canEdit ? 'hover:border-cyan-500 cursor-pointer' : 'cursor-default'}`}
                  style={p ? { background: colorFor(p.room_type) + '33', borderColor: colorFor(p.room_type) } : { background: '#1e293b' }}>
                  {p ? (
                    <span className="font-medium leading-tight">{p.room_name}{p.note ? ' 📝' : ''}</span>
                  ) : (
                    <span className="text-slate-600">+</span>
                  )}
                </button>
              )
            })
          )}
        </div>
      </main>

      {/* Panneau notes overall */}
      <aside className="w-72 bg-slate-800/50 p-4 shrink-0 flex flex-col">
        <h3 className="font-bold mb-2">📝 Notes du jour</h3>
        <p className="text-xs text-slate-500 mb-2">Notes "overall" propres à ce run.</p>
        <textarea value={overall} onChange={canEdit ? onNotesChange : undefined} readOnly={!canEdit}
          placeholder="Tout ce que tu veux retenir pour ce jour…"
          className="flex-1 bg-slate-900 border border-slate-600 rounded p-3 text-sm resize-none mb-3" />
        <LinksPanel type="day" id={current} title="Liens du jour" />
      </aside>

      {cell && (
        <CellEditor
          cell={cell} types={types} rooms={rooms} dayNumber={current}
          onClose={() => setCell(null)} onSave={savePlacement} onClear={clearCell}
          onRoomCreated={loadCatalog}
        />
      )}
    </div>
  )
}

function CellEditor({ cell, types, rooms, onClose, onSave, onClear, onRoomCreated }) {
  const ex = cell.existing
  const [mode, setMode] = useState(ex?.room_id ? 'existing' : 'existing')
  const [roomId, setRoomId] = useState(ex?.room_id || '')
  const [note, setNote] = useState(ex?.note || '')
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState(types[0]?.name || '')

  const submit = async (e) => {
    e.preventDefault()
    let rid = roomId
    if (mode === 'new') {
      if (!newName.trim()) return
      const room = await api.createRoom({ name: newName.trim(), type: newType })
      rid = room.id
      onRoomCreated()
    }
    onSave({ room_id: rid ? Number(rid) : null, note })
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-20" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit}
        className="bg-slate-800 rounded-xl p-5 w-96 space-y-4">
        <h3 className="font-bold text-lg">Case [{cell.row + 1}, {cell.col + 1}]</h3>

        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setMode('existing')}
            className={`px-3 py-1 rounded ${mode === 'existing' ? 'bg-cyan-600' : 'bg-slate-700'}`}>Pièce connue</button>
          <button type="button" onClick={() => setMode('new')}
            className={`px-3 py-1 rounded ${mode === 'new' ? 'bg-cyan-600' : 'bg-slate-700'}`}>Nouvelle pièce</button>
        </div>

        {mode === 'existing' ? (
          <select value={roomId} onChange={(e) => setRoomId(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2">
            <option value="">— choisir —</option>
            {rooms.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.type})</option>)}
          </select>
        ) : (
          <div className="space-y-2">
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nom de la pièce" autoFocus
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2" />
            <select value={newType} onChange={(e) => setNewType(e.target.value)}
              className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-2">
              {types.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs text-slate-400 mb-1">Note pour ce jour (liée à cette case)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm" />
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            <button type="submit" className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">Placer</button>
            <button type="button" onClick={onClose} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded">Annuler</button>
          </div>
          {ex && <button type="button" onClick={onClear} className="text-red-400 hover:text-red-300">Vider</button>}
        </div>
      </form>
    </div>
  )
}
