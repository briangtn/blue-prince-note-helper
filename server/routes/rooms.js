import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Room types
router.get('/types', (req, res) => {
  res.json(db.prepare('SELECT * FROM room_types ORDER BY id').all())
})

router.post('/types', (req, res) => {
  const { name, color } = req.body
  try {
    const info = db
      .prepare('INSERT INTO room_types (name, color) VALUES (?, ?)')
      .run(name, color || '#64748b')
    res.json(db.prepare('SELECT * FROM room_types WHERE id = ?').get(info.lastInsertRowid))
  } catch (e) {
    res.status(400).json({ error: e.message })
  }
})

router.delete('/types/:id', (req, res) => {
  db.prepare('DELETE FROM room_types WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// Rooms
const FIELDS = ['name', 'type', 'position', 'chess_pieces', 'objects', 'letters', 'notes', 'gem_cost', 'power_conduit']

const DAYS_SEEN_SUBQUERY = `(SELECT GROUP_CONCAT(dn, ',') FROM (
  SELECT DISTINCT day_number AS dn FROM day_placements WHERE room_id = r.id ORDER BY day_number
)) AS days_seen`

router.get('/', (req, res) => {
  const { type, q } = req.query
  let sql = `SELECT r.*, ${DAYS_SEEN_SUBQUERY} FROM rooms r`
  const where = []
  const params = []
  if (type) {
    where.push('r.type = ?')
    params.push(type)
  }
  if (q) {
    where.push('(r.name LIKE ? OR r.notes LIKE ? OR r.objects LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY r.updated_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/:id', (req, res) => {
  res.json(db.prepare(`SELECT r.*, ${DAYS_SEEN_SUBQUERY} FROM rooms r WHERE r.id = ?`).get(req.params.id))
})

router.post('/', (req, res) => {
  const vals = FIELDS.map((f) => req.body[f] ?? null)
  const info = db
    .prepare(`INSERT INTO rooms (${FIELDS.join(',')}) VALUES (${FIELDS.map(() => '?').join(',')})`)
    .run(...vals)
  res.json(db.prepare('SELECT * FROM rooms WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const vals = FIELDS.map((f) => req.body[f] ?? null)
  db.prepare(
    `UPDATE rooms SET ${FIELDS.map((f) => `${f} = ?`).join(',')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).run(...vals, req.params.id)
  res.json(db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
