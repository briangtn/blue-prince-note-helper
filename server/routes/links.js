import { Router } from 'express'
import db from '../db.js'

const router = Router()

// --- Résolution des entités (catalogue de tout ce qui est liable) ---
function allEntities() {
  const out = []
  for (const r of db.prepare('SELECT id, name FROM rooms').all())
    out.push({ type: 'room', id: r.id, label: r.name })
  for (const d of db.prepare('SELECT day_number FROM days').all())
    out.push({ type: 'day', id: d.day_number, label: `Days ${String(d.day_number).padStart(2, '0')}` })
  for (const p of db.prepare('SELECT id, name FROM people').all())
    out.push({ type: 'person', id: p.id, label: p.name })
  for (const c of db.prepare('SELECT id, value FROM codes').all())
    out.push({ type: 'code', id: c.id, label: `🔑 ${c.value}` })
  for (const n of db.prepare('SELECT id, title FROM notes').all())
    out.push({ type: 'note', id: n.id, label: n.title || `Note #${n.id}` })
  for (const e of db.prepare('SELECT id, title FROM entities').all())
    out.push({ type: 'entity', id: e.id, label: e.title || `Entité #${e.id}` })
  for (const ev of db.prepare('SELECT id, title FROM events').all())
    out.push({ type: 'event', id: ev.id, label: ev.title || `Événement #${ev.id}` })
  for (const it of db.prepare('SELECT id, name FROM items').all())
    out.push({ type: 'item', id: it.id, label: `🎒 ${it.name}` })
  for (const cr of db.prepare('SELECT id, name FROM crafts').all())
    out.push({ type: 'craft', id: cr.id, label: `⚒️ ${cr.name}` })
  return out
}

function entityLabel(type, id, cache) {
  const key = `${type}:${id}`
  if (!cache.has(key)) {
    for (const e of allEntities()) cache.set(`${e.type}:${e.id}`, e.label)
  }
  return cache.get(key) || `${type} #${id}`
}

router.get('/entities', (req, res) => {
  res.json(allEntities())
})

// Liens touchant une entité donnée (dans les deux sens)
router.get('/', (req, res) => {
  const { type, id } = req.query
  const cache = new Map()
  if (type && id) {
    const rows = db
      .prepare(
        `SELECT * FROM links WHERE (from_type = ? AND from_id = ?) OR (to_type = ? AND to_id = ?)`
      )
      .all(type, id, type, id)
    const result = rows.map((l) => {
      const isFrom = l.from_type === type && String(l.from_id) === String(id)
      const otherType = isFrom ? l.to_type : l.from_type
      const otherId = isFrom ? l.to_id : l.from_id
      return {
        ...l,
        direction: isFrom ? 'out' : 'in',
        other_type: otherType,
        other_id: otherId,
        other_label: entityLabel(otherType, otherId, cache),
      }
    })
    return res.json(result)
  }
  res.json(db.prepare('SELECT * FROM links').all())
})

router.post('/', (req, res) => {
  const { from_type, from_id, to_type, to_id, label } = req.body
  const info = db
    .prepare('INSERT INTO links (from_type, from_id, to_type, to_id, label) VALUES (?, ?, ?, ?, ?)')
    .run(from_type, from_id, to_type, to_id, label ?? null)
  res.json(db.prepare('SELECT * FROM links WHERE id = ?').get(info.lastInsertRowid))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM links WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Graphe global : tout ce qui est liable + tous les liens
router.get('/graph', (req, res) => {
  const nodes = allEntities()
  const edges = db.prepare('SELECT * FROM links').all()
  res.json({ nodes, edges })
})

export default router
