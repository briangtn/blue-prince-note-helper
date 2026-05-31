import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'blueprince.db')

const REMOTE_URL = process.env.REMOTE_URL
const REMOTE_USER = process.env.REMOTE_USER
const REMOTE_PASS = process.env.REMOTE_PASS

if (!REMOTE_URL || !REMOTE_USER || !REMOTE_PASS) {
  console.error('Usage: REMOTE_URL=https://... REMOTE_USER=xxx REMOTE_PASS=yyy node server/export-to-remote.js')
  process.exit(1)
}

const db = new Database(dbPath, { readonly: true })
const authHeader = 'Basic ' + Buffer.from(`${REMOTE_USER}:${REMOTE_PASS}`).toString('base64')

const stats = {}
function stat(table, action) {
  if (!stats[table]) stats[table] = { created: 0, skipped: 0, failed: 0 }
  stats[table][action]++
}

async function api(method, path, body) {
  const opts = {
    method,
    headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
  }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(`${REMOTE_URL}${path}`, opts)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`${method} ${path} → ${res.status}: ${text}`)
  }
  return res.json()
}

// ID mappings: localId -> remoteId
const roomMap = new Map()
const personMap = new Map()
const codeMap = new Map()
const noteMap = new Map()

function remapId(type, localId) {
  switch (type) {
    case 'room': return roomMap.get(localId)
    case 'person': return personMap.get(localId)
    case 'code': return codeMap.get(localId)
    case 'note': return noteMap.get(localId)
    case 'day': return localId
    default: return localId
  }
}

async function exportRoomTypes() {
  console.log('\n── Room Types ──')
  const local = db.prepare('SELECT * FROM room_types').all()
  const remote = await api('GET', '/api/rooms/types')
  const remoteByName = new Map(remote.map(r => [r.name, r]))

  for (const rt of local) {
    if (remoteByName.has(rt.name)) {
      console.log(`  skip: ${rt.name}`)
      stat('room_types', 'skipped')
    } else {
      try {
        await api('POST', '/api/rooms/types', { name: rt.name, color: rt.color })
        console.log(`  created: ${rt.name}`)
        stat('room_types', 'created')
      } catch (e) {
        console.error(`  FAILED: ${rt.name} — ${e.message}`)
        stat('room_types', 'failed')
      }
    }
  }
}

async function exportRooms() {
  console.log('\n── Rooms ──')
  const local = db.prepare('SELECT * FROM rooms').all()
  const remote = await api('GET', '/api/rooms')
  const remoteByName = new Map(remote.map(r => [r.name, r]))

  for (const room of local) {
    const existing = remoteByName.get(room.name)
    if (existing) {
      roomMap.set(room.id, existing.id)
      console.log(`  skip: ${room.name}`)
      stat('rooms', 'skipped')
    } else {
      try {
        const created = await api('POST', '/api/rooms', {
          name: room.name, type: room.type, position: room.position,
          tableau_combo: room.tableau_combo, tableau_combos: room.tableau_combos,
          chess_pieces: room.chess_pieces, objects: room.objects,
          letters: room.letters, days_seen: room.days_seen,
          notes: room.notes, gem_cost: room.gem_cost,
        })
        roomMap.set(room.id, created.id)
        console.log(`  created: ${room.name}`)
        stat('rooms', 'created')
      } catch (e) {
        console.error(`  FAILED: ${room.name} — ${e.message}`)
        stat('rooms', 'failed')
      }
    }
  }
}

async function exportPeople() {
  console.log('\n── People ──')
  const local = db.prepare('SELECT * FROM people').all()
  const remote = await api('GET', '/api/people')
  const remoteByName = new Map(remote.map(r => [r.name, r]))

  for (const p of local) {
    const existing = remoteByName.get(p.name)
    if (existing) {
      personMap.set(p.id, existing.id)
      console.log(`  skip: ${p.name}`)
      stat('people', 'skipped')
    } else {
      try {
        const created = await api('POST', '/api/people', {
          name: p.name, role: p.role, day_met: p.day_met,
          status: p.status, notes: p.notes,
        })
        personMap.set(p.id, created.id)
        console.log(`  created: ${p.name}`)
        stat('people', 'created')
      } catch (e) {
        console.error(`  FAILED: ${p.name} — ${e.message}`)
        stat('people', 'failed')
        continue
      }
    }
    const remoteId = personMap.get(p.id)
    if (remoteId && (p.tree_x != null || p.tree_y != null)) {
      await api('PUT', `/api/people/${remoteId}/position`, { tree_x: p.tree_x, tree_y: p.tree_y })
    }
  }
}

async function exportCodes() {
  console.log('\n── Codes ──')
  const local = db.prepare('SELECT * FROM codes').all()
  const remote = await api('GET', '/api/codes')
  const remoteByValue = new Map(remote.map(r => [r.value, r]))

  for (const c of local) {
    const existing = remoteByValue.get(c.value)
    if (existing) {
      codeMap.set(c.id, existing.id)
      console.log(`  skip: ${c.value}`)
      stat('codes', 'skipped')
    } else {
      try {
        const created = await api('POST', '/api/codes', {
          value: c.value, context: c.context, status: c.status, notes: c.notes,
        })
        codeMap.set(c.id, created.id)
        console.log(`  created: ${c.value}`)
        stat('codes', 'created')
      } catch (e) {
        console.error(`  FAILED: ${c.value} — ${e.message}`)
        stat('codes', 'failed')
      }
    }
  }
}

async function exportNotes() {
  console.log('\n── Notes ──')
  const local = db.prepare('SELECT * FROM notes').all()
  const remote = await api('GET', '/api/notes')
  const remoteByTitle = new Map(remote.filter(r => r.title).map(r => [r.title, r]))

  for (const n of local) {
    const existing = n.title ? remoteByTitle.get(n.title) : null
    if (existing) {
      noteMap.set(n.id, existing.id)
      console.log(`  skip: ${n.title}`)
      stat('notes', 'skipped')
    } else {
      try {
        const created = await api('POST', '/api/notes', { title: n.title, body: n.body })
        noteMap.set(n.id, created.id)
        console.log(`  created: ${n.title || `(note #${n.id})`}`)
        stat('notes', 'created')
      } catch (e) {
        console.error(`  FAILED: ${n.title || `(note #${n.id})`} — ${e.message}`)
        stat('notes', 'failed')
      }
    }
  }
}

async function exportDays() {
  console.log('\n── Days ──')
  const local = db.prepare('SELECT * FROM days').all()

  for (const d of local) {
    try {
      await api('POST', '/api/days', { day_number: d.day_number })
      if (d.overall_notes) {
        await api('PUT', `/api/days/${d.day_number}`, { overall_notes: d.overall_notes })
      }
      console.log(`  created/updated: Day ${d.day_number}`)
      stat('days', 'created')
    } catch (e) {
      console.error(`  FAILED: Day ${d.day_number} — ${e.message}`)
      stat('days', 'failed')
    }
  }
}

async function exportDayPlacements() {
  console.log('\n── Day Placements ──')
  const local = db.prepare('SELECT * FROM day_placements').all()

  for (const p of local) {
    const remoteRoomId = p.room_id != null ? roomMap.get(p.room_id) : null
    if (p.room_id != null && remoteRoomId == null) {
      console.warn(`  WARN: day ${p.day_number} row=${p.row} col=${p.col} — room_id ${p.room_id} has no mapping, skipping`)
      stat('day_placements', 'failed')
      continue
    }
    try {
      await api('PUT', `/api/days/${p.day_number}/placement`, {
        row: p.row, col: p.col, room_id: remoteRoomId, note: p.note,
      })
      console.log(`  placed: Day ${p.day_number} [${p.row},${p.col}]`)
      stat('day_placements', 'created')
    } catch (e) {
      console.error(`  FAILED: Day ${p.day_number} [${p.row},${p.col}] — ${e.message}`)
      stat('day_placements', 'failed')
    }
  }
}

async function exportLinks() {
  console.log('\n── Links ──')
  const local = db.prepare('SELECT * FROM links').all()
  const remote = await api('GET', '/api/links')
  const remoteSet = new Set(remote.map(l => `${l.from_type}:${l.from_id}:${l.to_type}:${l.to_id}:${l.label || ''}`))

  for (const l of local) {
    const fromId = remapId(l.from_type, l.from_id)
    const toId = remapId(l.to_type, l.to_id)
    if (fromId == null || toId == null) {
      console.warn(`  WARN: link ${l.from_type}#${l.from_id} → ${l.to_type}#${l.to_id} — missing mapping, skipping`)
      stat('links', 'failed')
      continue
    }
    const key = `${l.from_type}:${fromId}:${l.to_type}:${toId}:${l.label || ''}`
    if (remoteSet.has(key)) {
      console.log(`  skip: ${l.from_type}#${fromId} → ${l.to_type}#${toId}`)
      stat('links', 'skipped')
      continue
    }
    try {
      await api('POST', '/api/links', {
        from_type: l.from_type, from_id: fromId,
        to_type: l.to_type, to_id: toId, label: l.label,
      })
      console.log(`  created: ${l.from_type}#${fromId} → ${l.to_type}#${toId}`)
      stat('links', 'created')
    } catch (e) {
      console.error(`  FAILED: link — ${e.message}`)
      stat('links', 'failed')
    }
  }
}

async function exportWhiteboard() {
  console.log('\n── Whiteboard ──')
  const nodes = db.prepare('SELECT * FROM whiteboard_nodes').all().map(n => ({
    id: n.id, label: n.label, type: n.type,
    pos_x: n.pos_x, pos_y: n.pos_y, data: n.data,
  }))
  const edges = db.prepare('SELECT * FROM whiteboard_edges').all().map(e => ({
    id: e.id, source: e.source, target: e.target, label: e.label,
  }))
  if (nodes.length === 0 && edges.length === 0) {
    console.log('  (empty, skipping)')
    return
  }
  try {
    await api('PUT', '/api/whiteboard', { nodes, edges })
    console.log(`  pushed: ${nodes.length} nodes, ${edges.length} edges`)
    stat('whiteboard', 'created')
  } catch (e) {
    console.error(`  FAILED: ${e.message}`)
    stat('whiteboard', 'failed')
  }
}

async function main() {
  console.log(`Local DB: ${dbPath}`)
  console.log(`Remote:   ${REMOTE_URL}`)

  try {
    await api('GET', '/healthz')
    console.log('Remote health check: OK')
  } catch (e) {
    console.error(`Remote unreachable: ${e.message}`)
    process.exit(1)
  }

  await exportRoomTypes()
  await exportRooms()
  await exportPeople()
  await exportCodes()
  await exportNotes()
  await exportDays()
  await exportDayPlacements()
  await exportLinks()
  await exportWhiteboard()

  console.log('\n══ Summary ══')
  for (const [table, s] of Object.entries(stats)) {
    console.log(`  ${table}: ${s.created} created, ${s.skipped} skipped, ${s.failed} failed`)
  }
  console.log('Done.')
}

main().catch(e => { console.error(e); process.exit(1) })
