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
const FIELDS = ['name', 'type', 'position', 'tableau_combo', 'tableau_combos', 'chess_pieces', 'objects', 'letters', 'days_seen', 'notes', 'gem_cost']

router.get('/', (req, res) => {
  const { type, q } = req.query
  let sql = 'SELECT * FROM rooms'
  const where = []
  const params = []
  if (type) {
    where.push('type = ?')
    params.push(type)
  }
  if (q) {
    where.push('(name LIKE ? OR notes LIKE ? OR objects LIKE ?)')
    const like = `%${q}%`
    params.push(like, like, like)
  }
  if (where.length) sql += ' WHERE ' + where.join(' AND ')
  sql += ' ORDER BY updated_at DESC'
  res.json(db.prepare(sql).all(...params))
})

router.get('/:id', (req, res) => {
  res.json(db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id))
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
