import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client.js'
import { formatGameDate } from '../api/gameDate.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import LinksPanel from './LinksPanel.jsx'
import { Input, TextArea, Select, Btn, Badge, typeColor, ChessPieceSelector, chessSymbol, CHESS_SYMBOLS } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { lookupRoom, KNOWN_ROOM_NAMES } from '../api/roomCatalog.js'

const ROWS = 9
const COLS = 5
const ANTECHAMBER = { row: 0, col: 2 }
const ENTRANCE = { row: ROWS - 1, col: 2 }

const isFixed = (r, c) =>
  (r === ANTECHAMBER.row && c === ANTECHAMBER.col) ||
  (r === ENTRANCE.row && c === ENTRANCE.col)

// Column letter A-E, row number 1-9
function cellLabel(r, c) {
  return String.fromCharCode(65 + c) + (r + 1)
}


const DETAIL_FIELDS = [
  ['chess_pieces', "Pièces d'échecs"],
  ['objects', 'Objets'],
  ['letters', 'Lettres'],
  ['days_seen', 'Jours vus'],
]

function parseCombos(json) {
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

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

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

  // Selected cell and side-panel mode
  const [selectedCell, setSelectedCell] = useState(null) // {row, col}
  const [panelMode, setPanelMode] = useState('idle') // 'idle' | 'pick' | 'detail' | 'newRoom' | 'editRoom'

  const notesTimer = useRef(null)

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadDays = useCallback(() => api.listDays().then(setDays), [])
  const loadCatalog = useCallback(() => {
    api.listTypes().then(setTypes)
    api.listRooms().then(setRooms)
  }, [])

  const loadDay = useCallback((n) => {
    if (n == null) return
    api.getDay(n).then(({ day, placements: pl }) => {
      setPlacements(pl)
      setOverall(day.overall_notes || '')
    })
  }, [])

  useEffect(() => { loadDays(); loadCatalog() }, [loadDays, loadCatalog])
  useEffect(() => { loadDay(current) }, [current, loadDay])
  useWs(() => { loadDays(); loadCatalog(); loadDay(current) }, ['days', 'rooms'])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const placementAt = (r, c) => placements.find((p) => p.row === r && p.col === c)

  const switchDay = (n) => {
    const num = Number(n)
    localStorage.setItem('bp_current_day', String(num))
    setCurrent(num)
    setSelectedCell(null)
    setPanelMode('idle')
  }

  const startDay = async () => {
    const input = prompt('Numéro du jour (Days XX) :')
    const n = parseInt(input, 10)
    if (!n || n < 1) return
    await api.startDay(n)
    switchDay(n)
    loadDays()
  }

  // ── Notes debounce ────────────────────────────────────────────────────────

  const onNotesChange = (e) => {
    const val = e.target.value
    setOverall(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => api.updateDayNotes(current, val), 500)
  }

  // ── Cell interaction ──────────────────────────────────────────────────────

  const handleCellClick = (r, c) => {
    if (!canEdit) return
    const existing = placementAt(r, c)
    setSelectedCell({ row: r, col: c })
    if (existing) {
      setPanelMode('detail')
    } else {
      setPanelMode('pick')
    }
  }

  const closePanel = () => {
    setSelectedCell(null)
    setPanelMode('idle')
  }

  // ── Placement actions ─────────────────────────────────────────────────────

  const handlePlaceRoom = async (room_id, note = '') => {
    if (!selectedCell) return
    await api.setPlacement(current, { row: selectedCell.row, col: selectedCell.col, room_id, note })
    await loadDay(current)
    loadCatalog()
    setPanelMode('detail')
  }

  const handleRemovePlacement = async () => {
    if (!selectedCell) return
    await api.removePlacement(current, { row: selectedCell.row, col: selectedCell.col })
    await loadDay(current)
    setSelectedCell(null)
    setPanelMode('idle')
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalCells = ROWS * COLS - 2 // minus 2 fixed
  const placed = placements.filter(p => !isFixed(p.row, p.col)).length
  const free = totalCells - placed

  // ─────────────────────────────────────────────────────────────────────────
  // No day selected
  // ─────────────────────────────────────────────────────────────────────────

  if (current == null) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', gap: 24,
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: 32, fontWeight: 700,
            color: 'var(--bp-text)', marginBottom: 8,
          }}>Aucun jour en cours</div>
          <p style={{ color: 'var(--bp-text-muted)', fontSize: 14 }}>
            Commencez un nouveau jour ou reprenez un existant.
          </p>
        </div>
        {canEdit && (
          <Btn variant="accent" style={{ fontSize: 15, padding: '10px 24px' }} onClick={startDay}>
            <Icons.plus style={{ width: 16, height: 16 }} />
            Commencer un jour
          </Btn>
        )}
        {days.length > 0 && (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 12, color: 'var(--bp-text-muted)', marginBottom: 10 }}>
              Reprendre un jour existant :
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 480 }}>
              {days.map((d) => (
                <Btn key={d.day_number} onClick={() => switchDay(d.day_number)}>
                  Days {String(d.day_number).padStart(2, '0')}
                </Btn>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Main layout
  // ─────────────────────────────────────────────────────────────────────────

  const selectedPlacement = selectedCell ? placementAt(selectedCell.row, selectedCell.col) : null
  const selectedRoom = selectedPlacement
    ? rooms.find(r => r.id === selectedPlacement.room_id) || null
    : null

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* ── LEFT COLUMN ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 24px', overflow: 'auto' }}>

        {/* Day header */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
            {/* Prev / Next arrows */}
            <Btn
              small ghost
              style={{ padding: '4px 6px' }}
              onClick={() => {
                const sorted = [...days].sort((a, b) => a.day_number - b.day_number)
                const idx = sorted.findIndex(d => d.day_number === current)
                if (idx > 0) switchDay(sorted[idx - 1].day_number)
              }}
              disabled={!days.some(d => d.day_number < current)}
            >
              <Icons.chevL style={{ width: 16, height: 16 }} />
            </Btn>

            <h2 style={{
              fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700,
              color: 'var(--bp-text)', margin: 0, lineHeight: 1,
            }}>
              Days {String(current).padStart(2, '0')}
            </h2>

            <Btn
              small ghost
              style={{ padding: '4px 6px' }}
              onClick={() => {
                const sorted = [...days].sort((a, b) => a.day_number - b.day_number)
                const idx = sorted.findIndex(d => d.day_number === current)
                if (idx < sorted.length - 1) switchDay(sorted[idx + 1].day_number)
              }}
              disabled={!days.some(d => d.day_number > current)}
            >
              <Icons.chevR style={{ width: 16, height: 16 }} />
            </Btn>

            <span style={{
              color: 'var(--bp-accent)', fontSize: 13, fontFamily: 'var(--font-body)',
              textTransform: 'capitalize',
            }}>
              {formatGameDate(current)}
            </span>
          </div>

          {/* Day selector + new day button */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Select
              value={current}
              onChange={(e) => switchDay(Number(e.target.value))}
              style={{ width: 'auto', minWidth: 140 }}
            >
              {days.map((d) => (
                <option key={d.day_number} value={d.day_number}>
                  Days {String(d.day_number).padStart(2, '0')}
                </option>
              ))}
            </Select>
            {canEdit && (
              <Btn small variant="accent" onClick={startDay}>
                <Icons.plus style={{ width: 13, height: 13 }} />
                Nouveau jour
              </Btn>
            )}
            <span style={{ fontSize: 12, color: 'var(--bp-text-muted)', marginLeft: 8 }}>
              {placed} pièce{placed !== 1 ? 's' : ''} placée{placed !== 1 ? 's' : ''},&nbsp;
              {free} libre{free !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${COLS}, minmax(80px, 110px))`,
          gap: 6,
          padding: 16,
          borderRadius: 12,
          background: 'var(--bp-surface)',
          border: '1px solid var(--bp-border)',
          width: 'fit-content',
        }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const label = cellLabel(r, c)
              const fixed = isFixed(r, c)
              const fixedName = (r === ANTECHAMBER.row && c === ANTECHAMBER.col)
                ? 'Antechamber'
                : 'Entrance Hall'
              const p = placementAt(r, c)
              const color = p ? typeColor(p.room_type, types) : null
              const isSelected = selectedCell?.row === r && selectedCell?.col === c
              const chess = p ? chessSymbol(p.chess_pieces) : null

              if (fixed) {
                return (
                  <div key={`${r}-${c}`} style={{
                    aspectRatio: '1.2',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bp-panel)',
                    border: '1px solid var(--bp-border)',
                    padding: '4px 6px',
                    position: 'relative',
                    cursor: 'default',
                  }}>
                    <span style={{
                      position: 'absolute', top: 4, left: 5,
                      fontSize: 9, color: 'var(--bp-text-muted)',
                      fontFamily: 'var(--font-mono)',
                    }}>{label}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--bp-text-dim)', textAlign: 'center', lineHeight: 1.3 }}>
                      {fixedName}
                    </span>
                  </div>
                )
              }

              return (
                <button
                  key={`${r}-${c}`}
                  onClick={canEdit ? () => handleCellClick(r, c) : undefined}
                  style={{
                    aspectRatio: '1.2',
                    borderRadius: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '4px 6px',
                    position: 'relative',
                    cursor: canEdit ? 'pointer' : 'default',
                    background: p ? (color + '18') : 'transparent',
                    border: isSelected
                      ? `2px solid ${color || 'var(--bp-accent)'}`
                      : p
                        ? `2px solid ${color + '80'}`
                        : '1.5px dashed var(--bp-border)',
                    boxShadow: isSelected
                      ? `0 0 0 3px ${(color || 'var(--bp-accent)') + '30'}`
                      : 'none',
                    transition: 'all .15s',
                    fontFamily: 'var(--font-body)',
                  }}
                >
                  {/* Top-left: cell label */}
                  <span style={{
                    position: 'absolute', top: 4, left: 5,
                    fontSize: 9, color: 'var(--bp-text-muted)',
                    fontFamily: 'var(--font-mono)',
                  }}>{label}</span>

                  {/* Top-right: chess piece */}
                  {chess && (
                    <span style={{
                      position: 'absolute', top: 3, right: 5,
                      fontSize: 11, opacity: 0.75,
                    }}>{chess}</span>
                  )}

                  {p ? (
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      color: color || 'var(--bp-text)',
                      textAlign: 'center', lineHeight: 1.3,
                      wordBreak: 'break-word',
                      maxWidth: '100%',
                    }}>
                      {p.room_name}
                    </span>
                  ) : (
                    <span style={{ fontSize: 18, color: 'var(--bp-border)', lineHeight: 1 }}>+</span>
                  )}
                </button>
              )
            })
          )}
        </div>

        {/* Legend */}
        <div style={{ marginTop: 16, display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {types.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: typeColor(t.name, types),
                flexShrink: 0,
              }} />
              <span style={{ fontSize: 12, color: 'var(--bp-text-dim)' }}>{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width: 300,
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--bp-border)',
        background: 'var(--bp-surface)',
        overflow: 'hidden',
      }}>
        <SidePanel
          mode={panelMode}
          setMode={setPanelMode}
          selectedCell={selectedCell}
          selectedPlacement={selectedPlacement}
          selectedRoom={selectedRoom}
          rooms={rooms}
          types={types}
          canEdit={canEdit}
          current={current}
          overall={overall}
          onNotesChange={onNotesChange}
          onClose={closePanel}
          onPlaceRoom={handlePlaceRoom}
          onRemovePlacement={handleRemovePlacement}
          onRoomCreated={() => { loadCatalog(); loadDay(current) }}
          onRoomUpdated={() => { loadCatalog(); loadDay(current) }}
        />
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Side Panel
// ─────────────────────────────────────────────────────────────────────────────

function SidePanel({
  mode, setMode,
  selectedCell, selectedPlacement, selectedRoom,
  rooms, types, canEdit, current,
  overall, onNotesChange,
  onClose, onPlaceRoom, onRemovePlacement, onRoomCreated, onRoomUpdated,
}) {
  const label = selectedCell ? cellLabel(selectedCell.row, selectedCell.col) : null

  const panelTitle = mode === 'idle'
    ? 'Notes du jour'
    : mode === 'pick'
      ? `Case ${label} — Choisir une pièce`
      : mode === 'detail'
        ? `Case ${label} — ${selectedPlacement?.room_name || 'Détail'}`
        : mode === 'newRoom'
          ? 'Nouvelle pièce'
          : mode === 'editRoom'
            ? 'Modifier la pièce'
            : ''

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 14px', borderBottom: '1px solid var(--bp-border)',
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600,
          color: 'var(--bp-text)',
        }}>{panelTitle}</span>
        {mode !== 'idle' && (
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--bp-text-muted)', display: 'flex', alignItems: 'center',
            padding: 2,
          }}>
            <Icons.close style={{ width: 14, height: 14 }} />
          </button>
        )}
      </div>

      {/* Panel body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
        {mode === 'idle' && (
          <IdlePanel
            overall={overall}
            onNotesChange={onNotesChange}
            canEdit={canEdit}
            current={current}
          />
        )}
        {mode === 'pick' && (
          <PickPanel
            rooms={rooms}
            types={types}
            onPick={onPlaceRoom}
            onNewRoom={() => setMode('newRoom')}
          />
        )}
        {mode === 'detail' && selectedPlacement && (
          <DetailPanel
            placement={selectedPlacement}
            room={selectedRoom}
            types={types}
            canEdit={canEdit}
            onEdit={() => setMode('editRoom')}
            onRemove={onRemovePlacement}
            current={current}
          />
        )}
        {mode === 'newRoom' && (
          <NewRoomPanel
            types={types}
            onCreated={async (room) => {
              onRoomCreated()
              await onPlaceRoom(room.id, '')
            }}
            onCancel={() => setMode('pick')}
          />
        )}
        {mode === 'editRoom' && selectedRoom && (
          <EditRoomPanel
            room={selectedRoom}
            types={types}
            onSaved={() => { onRoomUpdated(); setMode('detail') }}
            onCancel={() => setMode('detail')}
          />
        )}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Idle panel: day overall notes
// ─────────────────────────────────────────────────────────────────────────────

function IdlePanel({ overall, onNotesChange, canEdit, current }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%' }}>
      <TextArea
        value={overall}
        onChange={canEdit ? onNotesChange : undefined}
        readOnly={!canEdit}
        placeholder="Notes générales pour ce jour…"
        rows={8}
        style={{ resize: 'vertical' }}
      />
      <LinksPanel type="day" id={current} title="Liens du jour" />
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Pick panel: choose a room from catalog
// ─────────────────────────────────────────────────────────────────────────────

function PickPanel({ rooms, types, onPick, onNewRoom }) {
  const [search, setSearch] = useState('')

  const filtered = search.trim()
    ? rooms.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        (r.type || '').toLowerCase().includes(search.toLowerCase())
      )
    : rooms

  // Group by type
  const grouped = {}
  for (const r of filtered) {
    const t = r.type || 'Other'
    if (!grouped[t]) grouped[t] = []
    grouped[t].push(r)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, height: '100%' }}>
      <div style={{ position: 'relative' }}>
        <Icons.search style={{
          width: 14, height: 14,
          position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
          color: 'var(--bp-text-muted)',
        }} />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une pièce…"
          autoFocus
          style={{ paddingLeft: 30 }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.entries(grouped).map(([typeName, typeRooms]) => {
          const color = typeColor(typeName, types)
          return (
            <div key={typeName}>
              <div style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '.05em',
                color, textTransform: 'uppercase', marginBottom: 4,
              }}>{typeName}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {typeRooms.map(r => (
                  <button
                    key={r.id}
                    onClick={() => onPick(r.id, '')}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '6px 10px', borderRadius: 6, border: 'none',
                      background: 'var(--bp-panel)', cursor: 'pointer',
                      color: 'var(--bp-text)', fontSize: 12, textAlign: 'left',
                      transition: 'background .1s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--bp-card)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'var(--bp-panel)'}
                  >
                    <div style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    <span style={{ flex: 1 }}>{r.name}</span>
                    {r.gem_cost != null && r.gem_cost !== '' && (
                      <span style={{ fontSize: 10, color: 'var(--bp-gold)' }}>
                        {r.gem_cost}💎
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ color: 'var(--bp-text-muted)', fontSize: 13, textAlign: 'center', marginTop: 24 }}>
            Aucune pièce trouvée
          </div>
        )}
      </div>

      <Btn small onClick={onNewRoom} style={{ width: '100%', justifyContent: 'center' }}>
        <Icons.plus style={{ width: 13, height: 13 }} />
        Nouvelle pièce
      </Btn>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Detail panel: show placed room info
// ─────────────────────────────────────────────────────────────────────────────

function DetailPanel({ placement, room, types, canEdit, onEdit, onRemove, current }) {
  const [roomNotes, setRoomNotes] = useState(room?.notes || '')
  const notesTimer = useRef(null)

  useEffect(() => {
    setRoomNotes(room?.notes || '')
    return () => clearTimeout(notesTimer.current)
  }, [room?.id])

  const onRoomNotesChange = (e) => {
    const val = e.target.value
    setRoomNotes(val)
    clearTimeout(notesTimer.current)
    notesTimer.current = setTimeout(() => {
      if (room) api.updateRoom(room.id, { ...room, notes: val })
    }, 500)
  }

  const color = typeColor(placement.room_type, types)

  const combos = room ? (() => {
    try {
      return JSON.parse(room.tableau_combos || '[]').filter(p => p[0] || p[1])
    } catch { return [] }
  })() : []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Room header */}
      <div>
        <div style={{
          fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
          color: 'var(--bp-text)', marginBottom: 2,
        }}>{placement.room_name}</div>
        <Badge color={color}>{placement.room_type}</Badge>
      </div>

      {/* Room fields */}
      {room && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 12px',
          background: 'var(--bp-panel)', borderRadius: 8, padding: '10px 12px',
        }}>
          {room.gem_cost != null && room.gem_cost !== '' && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginRight: 4 }}>Coût:</span>
              <span style={{ fontSize: 12, color: 'var(--bp-gold)' }}>{room.gem_cost} 💎</span>
            </div>
          )}
          {DETAIL_FIELDS.map(([k, label]) => room[k] ? (
            <div key={k}>
              <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 1 }}>{label}</div>
              <div style={{ fontSize: 12, color: 'var(--bp-text)' }}>{room[k]}</div>
            </div>
          ) : null)}
        </div>
      )}

      {/* Tableau combos */}
      {combos.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Tableaux</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {combos.map((pair, i) => (
              <Badge key={i} style={{ fontSize: 11 }}>
                {pair.filter(Boolean).join(' + ')}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Room notes — editable */}
      {room && (
        <div>
          <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Notes</div>
          <TextArea
            value={roomNotes}
            onChange={canEdit ? onRoomNotesChange : undefined}
            readOnly={!canEdit}
            placeholder="Notes sur cette pièce…"
            rows={4}
          />
        </div>
      )}

      {/* Links */}
      {room && <LinksPanel type="room" id={room.id} />}

      {/* Actions */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn small onClick={onEdit} style={{ flex: 1, justifyContent: 'center' }}>
            <Icons.edit style={{ width: 12, height: 12 }} />
            Éditer pièce
          </Btn>
          <Btn small variant="danger" onClick={() => { if (confirm('Retirer cette pièce ?')) onRemove() }}>
            <Icons.trash style={{ width: 12, height: 12 }} />
            Retirer
          </Btn>
        </div>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// New room panel
// ─────────────────────────────────────────────────────────────────────────────

function NewRoomPanel({ types, onCreated, onCancel }) {
  const [name, setName] = useState('')
  const [type, setType] = useState(types[0]?.name || '')
  const [gemCost, setGemCost] = useState('')
  const [matched, setMatched] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleName = (e) => {
    const value = e.target.value
    const hit = lookupRoom(value)
    setName(hit ? hit.name : value)
    if (hit) {
      setType(hit.type)
      if (hit.gem != null) setGemCost(String(hit.gem))
    }
    setMatched(!!hit)
  }

  const submit = async (e) => {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      const room = await api.createRoom({
        name: name.trim(),
        type: type || types[0]?.name || 'Other',
        gem_cost: gemCost !== '' ? Number(gemCost) : undefined,
      })
      onCreated(room)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>
          Nom {matched && <span style={{ color: '#5BAD6E' }}>(auto-rempli)</span>}
        </label>
        <Input
          list="room-catalog-new"
          value={name}
          onChange={handleName}
          placeholder="Nom de la pièce"
          autoFocus
          required
        />
        <datalist id="room-catalog-new">
          {KNOWN_ROOM_NAMES.map(n => <option key={n} value={n} />)}
        </datalist>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Type</label>
        <Select value={type} onChange={e => setType(e.target.value)}>
          {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </Select>
      </div>

      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Coût gemmes</label>
        <Input
          type="number"
          value={gemCost}
          onChange={e => setGemCost(e.target.value)}
          placeholder="0"
        />
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <Btn variant="accent" onClick={submit} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
          {saving ? '…' : 'Créer & placer'}
        </Btn>
        <Btn onClick={onCancel}>Annuler</Btn>
      </div>
    </form>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Edit room panel (full inline form)
// ─────────────────────────────────────────────────────────────────────────────

const EDIT_FIELDS = [
  ['objects', 'Objets', 'Clé, Pelle…'],
  ['letters', 'Lettres', '3,7,12'],
]

function EditRoomPanel({ room, types, onSaved, onCancel }) {
  const [form, setForm] = useState({
    name: room.name || '',
    type: room.type || '',
    gem_cost: room.gem_cost != null ? String(room.gem_cost) : '',
    chess_pieces: room.chess_pieces || '',
    objects: room.objects || '',
    letters: room.letters || '',
    notes: room.notes || '',
  })
  const [combos, setCombos] = useState(parseCombos(room.tableau_combos))
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const setCombo = (ci, pi) => (e) => {
    setCombos(c => {
      const next = c.map(pair => [...pair])
      next[ci][pi] = e.target.value
      return next
    })
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      const clean = combos.map(p => [p[0].trim(), p[1].trim()]).filter(p => p[0] || p[1])
      await api.updateRoom(room.id, {
        ...form,
        gem_cost: form.gem_cost !== '' ? Number(form.gem_cost) : null,
        tableau_combos: JSON.stringify(clean),
        tableau_combo: clean.flat().filter(Boolean).join(', '),
      })
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  const fieldStyle = {
    fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4,
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <label style={fieldStyle}>Nom</label>
        <Input value={form.name} onChange={set('name')} required />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <label style={fieldStyle}>Type</label>
          <Select value={form.type} onChange={set('type')}>
            {types.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </Select>
        </div>
        <div>
          <label style={fieldStyle}>Coût 💎</label>
          <Input type="number" value={form.gem_cost} onChange={set('gem_cost')} placeholder="0" />
        </div>
        {EDIT_FIELDS.map(([k, label, ph]) => (
          <div key={k}>
            <label style={fieldStyle}>{label}</label>
            <Input value={form[k]} onChange={set(k)} placeholder={ph} />
          </div>
        ))}
      </div>
      <div>
        <label style={fieldStyle}>Pièce d'échecs</label>
        <ChessPieceSelector value={form.chess_pieces} onChange={(v) => setForm(f => ({ ...f, chess_pieces: v }))} />
      </div>

      <div>
        <label style={fieldStyle}>Tableaux</label>
        {[0, 1].map(ci => (
          <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--bp-text-muted)', width: 44, flexShrink: 0 }}>Combo {ci + 1}</span>
            <Input value={combos[ci][0]} onChange={setCombo(ci, 0)} placeholder="tableau A"
              style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
            <span style={{ color: 'var(--bp-text-muted)', fontSize: 11 }}>/</span>
            <Input value={combos[ci][1]} onChange={setCombo(ci, 1)} placeholder="tableau B"
              style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
          </div>
        ))}
      </div>

      <div>
        <label style={fieldStyle}>Notes</label>
        <TextArea rows={3} value={form.notes} onChange={set('notes')} />
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <Btn variant="accent" onClick={submit} disabled={saving} style={{ flex: 1, justifyContent: 'center' }}>
          {saving ? '…' : 'Enregistrer'}
        </Btn>
        <Btn onClick={onCancel}>Annuler</Btn>
      </div>
    </form>
  )
}
