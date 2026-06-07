import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, Select, Btn, Badge, SectionHead, EmptyState, typeColor, chessSymbol, chessLabel } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import RoomForm from './RoomForm.jsx'
import LinksPanel from './LinksPanel.jsx'

const DETAIL_FIELDS = [
  ['position', 'Position'],
  ['chess_pieces', "Pièces d'échecs"],
  ['objects', 'Objets'],
  ['letters', 'Lettres'],
  ['days_seen', 'Jours vus'],
]

function RoomCard({ room, types, canEdit, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false)
  const color = typeColor(room.type, types)

  return (
    <div style={{
      background: 'var(--bp-surface)',
      borderRadius: 8,
      border: '1px solid var(--bp-border)',
      borderLeft: `3px solid ${color}`,
      overflow: 'hidden',
    }}>
      {/* Card header — always visible, click to expand */}
      <div
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--bp-text)' }}>{room.name}</span>
            {room.chess_pieces && chessSymbol(room.chess_pieces) && (
              <span title={chessLabel(room.chess_pieces)} style={{ fontSize: 14, color: 'var(--bp-text-muted)', cursor: 'help' }}>{chessSymbol(room.chess_pieces)}</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
            <span style={{ fontSize: 11, color }}>
              {room.type}
            </span>
            {room.gem_cost != null && room.gem_cost !== '' && (
              <Badge color="#5B8EC9" style={{ fontSize: 10, padding: '1px 6px' }}>
                <Icons.gem width={10} height={10} />
                {room.gem_cost}
              </Badge>
            )}
            {!!room.power_conduit && (
              <Badge color="var(--bp-gold)" style={{ fontSize: 10, padding: '1px 6px' }} title="Conduite énergie">
                ⚡ Énergie
              </Badge>
            )}
          </div>
        </div>
        <div style={{ color: 'var(--bp-text-muted)', flexShrink: 0 }}>
          {expanded
            ? <Icons.chevL width={16} height={16} style={{ transform: 'rotate(-90deg)' }} />
            : <Icons.chevR width={16} height={16} style={{ transform: 'rotate(90deg)' }} />
          }
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div style={{
          borderTop: '1px solid var(--bp-border)',
          padding: '12px 14px',
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          {/* Detail fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
            {DETAIL_FIELDS.map(([k, label]) =>
              room[k] ? (
                <div key={k} style={{ fontSize: 12 }}>
                  <span style={{ color: 'var(--bp-text-muted)' }}>{label}: </span>
                  <span style={{ color: 'var(--bp-text)' }}>{room[k]}</span>
                </div>
              ) : null
            )}
          </div>

          {/* Notes */}
          {room.notes && (
            <p style={{
              margin: 0, fontSize: 12, color: 'var(--bp-text)',
              whiteSpace: 'pre-wrap', lineHeight: 1.6,
              background: 'var(--bp-bg)', borderRadius: 4,
              padding: '6px 8px', border: '1px solid var(--bp-border)',
            }}>{room.notes}</p>
          )}

          {/* Links panel */}
          <LinksPanel type="room" id={room.id} />

          {/* Edit / Delete */}
          {canEdit && (
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn small variant="default" onClick={() => onEdit(room)}>
                <Icons.edit width={13} height={13} />
                Éditer
              </Btn>
              <Btn small variant="danger" onClick={() => onDelete(room.id)}>
                <Icons.trash width={13} height={13} />
                Supprimer
              </Btn>
            </div>
          )}
        </div>
      )}
    </div>
  )
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
  const loadRooms = useCallback(
    () => api.listRooms({ type: filterType, q }).then(setRooms),
    [filterType, q]
  )

  useEffect(() => { loadTypes() }, [loadTypes])
  useEffect(() => { loadRooms() }, [loadRooms])
  useWs(() => { loadTypes(); loadRooms() }, ['rooms'])

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

  // Group rooms by type for display
  const grouped = rooms.reduce((acc, room) => {
    const key = room.type || '(Sans type)'
    if (!acc[key]) acc[key] = []
    acc[key].push(room)
    return acc
  }, {})

  const typeGroups = Object.entries(grouped)

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      {/* LEFT SIDEBAR — Type filter */}
      <aside style={{
        width: 200,
        flexShrink: 0,
        background: 'var(--bp-surface)',
        borderRight: '1px solid var(--bp-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Sidebar title */}
        <div style={{
          padding: '14px 14px 8px',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '.05em',
          textTransform: 'uppercase',
          color: 'var(--bp-text-muted)',
        }}>
          Types
        </div>

        {/* Scrollable list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 8px' }}>
          {/* "Toutes" button */}
          <button
            onClick={() => setFilterType('')}
            style={{
              display: 'flex', alignItems: 'center', width: '100%',
              padding: '7px 10px', borderRadius: 6, border: 'none',
              marginBottom: 2, cursor: 'pointer', fontSize: 13,
              textAlign: 'left', justifyContent: 'space-between',
              background: !filterType ? 'var(--bp-panel)' : 'transparent',
              color: !filterType ? 'var(--bp-text)' : 'var(--bp-text-dim)',
              transition: 'background .1s',
            }}
          >
            <span>Toutes</span>
            <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>{rooms.length}</span>
          </button>

          {/* Type buttons */}
          {types.map((t) => {
            const count = rooms.filter((r) => r.type === t.name).length
            const active = filterType === t.name
            const color = typeColor(t.name, types)
            return (
              <button
                key={t.id}
                onClick={() => setFilterType(t.name)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                  padding: '7px 10px', borderRadius: 6, border: 'none',
                  marginBottom: 2, cursor: 'pointer', fontSize: 13,
                  textAlign: 'left',
                  background: active ? 'var(--bp-panel)' : 'transparent',
                  color: active ? color : 'var(--bp-text-dim)',
                  transition: 'background .1s',
                }}
              >
                {/* Color dot */}
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  background: color, flexShrink: 0,
                }} />
                <span style={{ flex: 1 }}>{t.name}</span>
                <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>{count}</span>
              </button>
            )
          })}
        </div>

        {/* Add type form (canEdit only) */}
        {canEdit && (
          <form
            onSubmit={addType}
            style={{
              padding: '8px 8px 12px',
              borderTop: '1px solid var(--bp-border)',
              display: 'flex', gap: 4,
            }}
          >
            <Input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              placeholder="Nouveau type"
              style={{ fontSize: 12, padding: '5px 8px' }}
            />
            <Btn small variant="accent" style={{ padding: '5px 10px', fontSize: 14, flexShrink: 0 }}>
              +
            </Btn>
          </form>
        )}
      </aside>

      {/* RIGHT MAIN AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px 0', flexShrink: 0 }}>
          <SectionHead title="Pièces">
            {canEdit && (
              <Btn variant="accent" small onClick={() => setEditing({})}>
                <Icons.plus width={13} height={13} />
                Pièce
              </Btn>
            )}
          </SectionHead>

          {/* Search input */}
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <span style={{
              position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--bp-text-muted)', pointerEvents: 'none',
              display: 'flex', alignItems: 'center',
            }}>
              <Icons.search width={15} height={15} />
            </span>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher (nom, notes, objets)…"
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 20px' }}>
          {/* RoomForm editing panel */}
          {editing !== null && (
            <div style={{
              background: 'var(--bp-surface)',
              border: '1px solid var(--bp-border)',
              borderRadius: 8,
              padding: 16,
              marginBottom: 16,
            }}>
              <RoomForm
                types={types}
                initial={editing}
                onSubmit={save}
                onCancel={() => setEditing(null)}
              />
            </div>
          )}

          {/* Room cards grouped by type */}
          {typeGroups.length === 0 && (
            <EmptyState
              icon={<Icons.door width={32} height={32} />}
              text="Aucune pièce pour ce filtre."
            />
          )}

          {typeGroups.map(([typeName, groupRooms]) => {
            const color = typeColor(typeName, types)
            return (
              <div key={typeName} style={{ marginBottom: 24 }}>
                {/* Group header */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  marginBottom: 10,
                }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    background: color, flexShrink: 0,
                  }} />
                  <span style={{
                    fontSize: 13, fontWeight: 600,
                    color, letterSpacing: '.02em',
                  }}>
                    {typeName}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>
                    {groupRooms.length}
                  </span>
                </div>

                {/* Cards grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
                  gap: 10,
                }}>
                  {groupRooms.map((room) => (
                    <RoomCard
                      key={room.id}
                      room={room}
                      types={types}
                      canEdit={canEdit}
                      onEdit={setEditing}
                      onDelete={remove}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
