import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '../api/client.js'
import { formatGameDate } from '../api/gameDate.js'
import { useWs } from '../api/useWs.js'
import { useCurrentDay } from '../api/currentDay.js'
import { useAuth } from '../AuthContext.jsx'
import LinksPanel from './LinksPanel.jsx'
import { Input, TextArea, Select, Btn, Badge, typeColor, ChessPieceSelector, chessSymbol, chessLabel, CHESS_SYMBOLS } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { lookupRoom, roomIconUrl } from '../api/roomCatalog.js'

const ROWS = 9
const COLS = 5

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

const EDIT_FIELDS = [
  ['objects', 'Objets', 'Clé, Pelle…'],
  ['letters', 'Lettres', '3,7,12'],
]

function parseCombos(json) {
  try {
    const a = JSON.parse(json || '[]')
    const pairs = a.map((p) => [p?.[0] || '', p?.[1] || ''])
    return pairs.length ? pairs : [['', '']]
  } catch {
    return [['', '']]
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function DayView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'

  const [days, setDays] = useState([])
  const [current, setCurrentDay] = useCurrentDay()
  const [placements, setPlacements] = useState([])
  const [sticky, setSticky] = useState([])
  const [overall, setOverall] = useState('')
  const [types, setTypes] = useState([])
  const [rooms, setRooms] = useState([])

  // Selected cell and side-panel mode
  const [selectedCell, setSelectedCell] = useState(null) // {row, col}
  const [panelMode, setPanelMode] = useState('idle') // 'idle' | 'pick' | 'detail' | 'newRoom'

  const notesTimer = useRef(null)

  // ── Resizable side panel ────────────────────────────────────────────────────
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = Number(localStorage.getItem('bp_daypanel_w'))
    return saved >= 240 && saved <= 900 ? saved : 320
  })
  const resizing = useRef(false)

  useEffect(() => {
    const onMove = (e) => {
      if (!resizing.current) return
      const w = window.innerWidth - e.clientX
      setPanelWidth(Math.min(900, Math.max(240, w)))
    }
    const onUp = () => {
      if (!resizing.current) return
      resizing.current = false
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('bp_daypanel_w', String(panelWidth))
  }, [panelWidth])

  // ── Data loading ──────────────────────────────────────────────────────────

  const loadDays = useCallback(() => api.listDays().then(setDays), [])
  const loadCatalog = useCallback(() => {
    api.listTypes().then(setTypes)
    api.listRooms().then(setRooms)
  }, [])

  const loadDay = useCallback((n) => {
    if (n == null) return
    api.getDay(n).then(({ day, placements: pl, sticky: st }) => {
      setPlacements(pl)
      setSticky(st || [])
      setOverall(day.overall_notes || '')
    })
  }, [])

  useEffect(() => { loadDays(); loadCatalog() }, [loadDays, loadCatalog])
  useEffect(() => { loadDay(current) }, [current, loadDay])
  useWs(() => { loadDays(); loadCatalog(); loadDay(current) }, ['days', 'rooms'])

  // ── Helpers ───────────────────────────────────────────────────────────────

  const stickyAt = (r, c) => sticky.find((p) => p.row === r && p.col === c)
  // Les placements sticky priment : ils occupent la cellule sur tous les jours.
  const placementAt = (r, c) => stickyAt(r, c) || placements.find((p) => p.row === r && p.col === c)

  const switchDay = (n) => {
    const num = Number(n)
    setCurrentDay(num)
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

  const nextDay = async () => {
    const n = (current || 0) + 1
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
    const { row, col } = selectedCell
    if (stickyAt(row, col)) await api.removeSticky({ row, col })
    else await api.removePlacement(current, { row, col })
    await loadDay(current)
    setSelectedCell(null)
    setPanelMode('idle')
  }

  // Épingler (toutes parties) un placement du jour, ou détacher un placement sticky.
  const handleToggleSticky = async () => {
    if (!selectedCell) return
    const { row, col } = selectedCell
    const stick = stickyAt(row, col)
    if (stick) {
      // Détacher : la cellule redevient vide pour ce jour → repasser en mode sélection.
      await api.removeSticky({ row, col })
      await loadDay(current)
      setPanelMode('pick')
    } else {
      const dayP = placements.find((p) => p.row === row && p.col === col)
      if (!dayP) return
      await api.setSticky({ row, col, room_id: dayP.room_id, note: dayP.note })
      await api.removePlacement(current, { row, col })
      await loadDay(current)
    }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────

  const totalCells = ROWS * COLS
  const occupied = new Set([...placements, ...sticky].map((p) => `${p.row}-${p.col}`))
  const placed = occupied.size
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
  const selectedIsSticky = selectedCell ? !!stickyAt(selectedCell.row, selectedCell.col) : false

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
            {canEdit && (
              <Btn small onClick={nextDay}>
                <Icons.chevR style={{ width: 13, height: 13 }} />
                Jour suivant
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
          gridTemplateColumns: `repeat(${COLS}, minmax(100px, 135px))`,
          gap: 7,
          padding: 16,
          borderRadius: 12,
          background: 'var(--bp-surface)',
          border: '1px solid var(--bp-border)',
          width: 'fit-content',
        }}>
          {Array.from({ length: ROWS }).map((_, r) =>
            Array.from({ length: COLS }).map((_, c) => {
              const label = cellLabel(r, c)
              const p = placementAt(r, c)
              const isStickyCell = !!stickyAt(r, c)
              const color = p ? typeColor(p.room_type, types) : null
              const isSelected = selectedCell?.row === r && selectedCell?.col === c
              const chess = p ? chessSymbol(p.chess_pieces) : null
              const chessName = p ? chessLabel(p.chess_pieces) : null

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
                      : isStickyCell
                        ? `2px solid var(--bp-gold)`
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
                    zIndex: 1,
                  }}>{label}</span>

                  {/* Top-right: chess piece + pin (épinglé) */}
                  {chess && (
                    <span title={chessName} style={{
                      position: 'absolute', top: 3, right: isStickyCell ? 22 : 5,
                      fontSize: 11, opacity: 0.75, cursor: 'help', zIndex: 1,
                    }}>{chess}</span>
                  )}
                  {isStickyCell && (
                    <span title="Épinglée (toutes les parties)" style={{
                      position: 'absolute', top: 3, right: 5,
                      fontSize: 11, zIndex: 1,
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}>📌</span>
                  )}

                  {p ? (() => {
                    const icon = roomIconUrl(p.room_name)
                    return (
                      <>
                        {icon && (
                          <img src={icon} alt={p.room_name} style={{
                            position: 'absolute', inset: 0,
                            width: '100%', height: '100%', objectFit: 'cover',
                            borderRadius: 6,
                          }} />
                        )}
                        <span style={{
                          position: 'absolute', left: 0, right: 0, bottom: 0,
                          padding: '3px 4px',
                          fontSize: 10, fontWeight: 700,
                          color: '#fff',
                          textAlign: 'center', lineHeight: 1.2,
                          wordBreak: 'break-word',
                          background: icon ? 'rgba(0,0,0,0.6)' : 'transparent',
                          borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
                          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                        }}>
                          {p.room_name}
                        </span>
                      </>
                    )
                  })() : (
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

      {/* ── RESIZE HANDLE ── */}
      <div
        onMouseDown={() => {
          resizing.current = true
          document.body.style.cursor = 'col-resize'
          document.body.style.userSelect = 'none'
        }}
        title="Glisser pour redimensionner"
        style={{
          width: 6,
          flexShrink: 0,
          cursor: 'col-resize',
          background: 'transparent',
          transition: 'background .15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bp-accent)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      />

      {/* ── RIGHT PANEL ── */}
      <div style={{
        width: panelWidth,
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
          selectedIsSticky={selectedIsSticky}
          rooms={rooms}
          types={types}
          canEdit={canEdit}
          current={current}
          overall={overall}
          onNotesChange={onNotesChange}
          onClose={closePanel}
          onPlaceRoom={handlePlaceRoom}
          onRemovePlacement={handleRemovePlacement}
          onToggleSticky={handleToggleSticky}
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
  selectedCell, selectedPlacement, selectedRoom, selectedIsSticky,
  rooms, types, canEdit, current,
  overall, onNotesChange,
  onClose, onPlaceRoom, onRemovePlacement, onToggleSticky, onRoomCreated, onRoomUpdated,
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
            isSticky={selectedIsSticky}
            types={types}
            canEdit={canEdit}
            onRemove={onRemovePlacement}
            onToggleSticky={onToggleSticky}
            onSaved={onRoomUpdated}
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
    const t = r.type || 'Blueprints'
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

function DetailPanel({ placement, room, isSticky, types, canEdit, onRemove, onToggleSticky, onSaved, current }) {
  const color = typeColor(placement.room_type, types)

  // ── Read-only view (RO users) ─────────────────────────────────────────────
  if (!canEdit) {
    const combos = room ? (() => {
      try { return JSON.parse(room.tableau_combos || '[]').filter(p => p[0] || p[1]) }
      catch { return [] }
    })() : []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700,
            color: 'var(--bp-text)', marginBottom: 2,
          }}>{placement.room_name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Badge color={color}>{placement.room_type}</Badge>
            {isSticky && <Badge color="var(--bp-gold)">📌 Épinglée</Badge>}
            {!!room?.power_conduit && <Badge color="var(--bp-gold)">⚡ Conduite énergie</Badge>}
          </div>
        </div>
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
        {combos.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Tableaux</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {combos.map((pair, i) => (
                <Badge key={i} style={{ fontSize: 11 }}>{pair.filter(Boolean).join(' + ')}</Badge>
              ))}
            </div>
          </div>
        )}
        {room?.notes && (
          <div>
            <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Notes</div>
            <div style={{ fontSize: 12, color: 'var(--bp-text)', whiteSpace: 'pre-wrap' }}>{room.notes}</div>
          </div>
        )}
        {room && <LinksPanel type="room" id={room.id} />}
      </div>
    )
  }

  return (
    <EditableDetailPanel
      placement={placement}
      room={room}
      isSticky={isSticky}
      types={types}
      color={color}
      onRemove={onRemove}
      onToggleSticky={onToggleSticky}
      onSaved={onSaved}
    />
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Editable detail panel — all room properties editable inline, auto-saved
// ─────────────────────────────────────────────────────────────────────────────

function EditableDetailPanel({ placement, room, isSticky, types, color, onRemove, onToggleSticky, onSaved }) {
  const [form, setForm] = useState(() => initForm(room))
  const [combos, setCombos] = useState(() => parseCombos(room?.tableau_combos))
  const [savedFlash, setSavedFlash] = useState(false)
  const saveTimer = useRef(null)
  const flashTimer = useRef(null)

  // Reset local state when the selected room changes (not on every re-fetch).
  useEffect(() => {
    setForm(initForm(room))
    setCombos(parseCombos(room?.tableau_combos))
    return () => { clearTimeout(saveTimer.current); clearTimeout(flashTimer.current) }
  }, [room?.id])

  const persist = (nextForm, nextCombos) => {
    if (!room) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(async () => {
      const clean = nextCombos.map(p => [p[0].trim(), p[1].trim()]).filter(p => p[0] || p[1])
      await api.updateRoom(room.id, {
        ...nextForm,
        gem_cost: nextForm.gem_cost !== '' ? Number(nextForm.gem_cost) : null,
        tableau_combos: JSON.stringify(clean),
        tableau_combo: clean.flat().filter(Boolean).join(', '),
      })
      setSavedFlash(true)
      clearTimeout(flashTimer.current)
      flashTimer.current = setTimeout(() => setSavedFlash(false), 1500)
      onSaved?.()
    }, 600)
  }

  const set = (k) => (e) => {
    const next = { ...form, [k]: e.target.value }
    setForm(next)
    persist(next, combos)
  }
  const setChess = (v) => {
    const next = { ...form, chess_pieces: v }
    setForm(next)
    persist(next, combos)
  }

  const setCombo = (ci, pi) => (e) => {
    const next = combos.map(pair => [...pair])
    next[ci][pi] = e.target.value
    setCombos(next)
    persist(form, next)
  }
  const addCombo = () => {
    const next = [...combos, ['', '']]
    setCombos(next)
  }
  const removeCombo = (ci) => {
    const filtered = combos.filter((_, i) => i !== ci)
    const next = filtered.length ? filtered : [['', '']]
    setCombos(next)
    persist(form, next)
  }

  const fieldStyle = { fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header: badges + save indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Badge color={color}>{form.type || placement.room_type}</Badge>
        {isSticky && <Badge color="var(--bp-gold)">📌 Épinglée</Badge>}
        <span style={{
          marginLeft: 'auto', fontSize: 10,
          color: savedFlash ? '#5BAD6E' : 'var(--bp-text-muted)',
          transition: 'color .2s',
        }}>
          {savedFlash ? '✓ Enregistré' : 'Auto-enregistré'}
        </span>
      </div>

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
        <ChessPieceSelector value={form.chess_pieces} onChange={setChess} />
      </div>

      <div>
        <label style={fieldStyle}>Tableaux</label>
        {combos.map((pair, ci) => (
          <div key={ci} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: 'var(--bp-text-muted)', width: 44, flexShrink: 0 }}>Combo {ci + 1}</span>
            <Input value={pair[0]} onChange={setCombo(ci, 0)} placeholder="tableau A"
              style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
            <span style={{ color: 'var(--bp-text-muted)', fontSize: 11 }}>/</span>
            <Input value={pair[1]} onChange={setCombo(ci, 1)} placeholder="tableau B"
              style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} />
            <button type="button" onClick={() => removeCombo(ci)} title="Supprimer"
              style={{ border: 'none', background: 'none', color: 'var(--bp-text-muted)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>−</button>
          </div>
        ))}
        <button type="button" onClick={addCombo}
          style={{ border: '1px dashed var(--bp-border)', background: 'none', color: 'var(--bp-text-muted)', cursor: 'pointer', fontSize: 12, padding: '4px 10px', borderRadius: 4 }}>
          + Ajouter une combinaison
        </button>
      </div>

      <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--bp-text)' }}>
        <input
          type="checkbox"
          checked={!!form.power_conduit}
          onChange={(e) => {
            const next = { ...form, power_conduit: e.target.checked ? 1 : 0 }
            setForm(next)
            persist(next, combos)
          }}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--bp-gold)' }}
        />
        ⚡ Conduite énergie
      </label>

      <div>
        <label style={fieldStyle}>Notes</label>
        <TextArea rows={4} value={form.notes} onChange={set('notes')} placeholder="Notes sur cette pièce…" />
      </div>

      {/* Links */}
      {room && <LinksPanel type="room" id={room.id} />}

      {/* Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Btn
          small
          onClick={onToggleSticky}
          style={{ width: '100%', justifyContent: 'center' }}
          title={isSticky
            ? 'Cette pièce n\'apparaîtra plus sur les autres jours'
            : 'Épingler à cette position sur toutes les parties'}
        >
          📌 {isSticky ? 'Détacher (toutes parties)' : 'Épingler (toutes parties)'}
        </Btn>
        <Btn small variant="danger" onClick={() => {
          if (confirm(isSticky ? 'Détacher et retirer cette pièce épinglée ?' : 'Retirer cette pièce ?')) onRemove()
        }} style={{ width: '100%', justifyContent: 'center' }}>
          <Icons.trash style={{ width: 12, height: 12 }} />
          Retirer
        </Btn>
      </div>
    </div>
  )
}

function initForm(room) {
  return {
    name: room?.name || '',
    type: room?.type || '',
    gem_cost: room?.gem_cost != null ? String(room.gem_cost) : '',
    chess_pieces: room?.chess_pieces || '',
    objects: room?.objects || '',
    letters: room?.letters || '',
    notes: room?.notes || '',
    power_conduit: room?.power_conduit ? 1 : 0,
  }
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
  const [error, setError] = useState('')

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
    if (!lookupRoom(name)) {
      setError('Salle inconnue du catalogue')
      return
    }
    setError('')
    setSaving(true)
    try {
      const room = await api.createRoom({
        name: name.trim(),
        type: type || types[0]?.name || 'Blueprints',
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
          value={name}
          onChange={handleName}
          placeholder="Nom de la pièce"
          autoFocus
          required
        />
        {error && <div style={{ fontSize: 11, color: '#C85454', marginTop: 4 }}>{error}</div>}
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

