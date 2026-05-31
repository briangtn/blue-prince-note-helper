import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM events ORDER BY date IS NULL, date ASC, updated_at DESC').all())
})

router.post('/', (req, res) => {
  const info = db
    .prepare('INSERT INTO events (title, description, date) VALUES (?, ?, ?)')
    .run(req.body.title ?? null, req.body.description ?? null, req.body.date ?? null)
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  db.prepare('UPDATE events SET title = ?, description = ?, date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    req.body.title ?? null,
    req.body.description ?? null,
    req.body.date ?? null,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM events WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM events WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'event' AND from_id = ?) OR (to_type = 'event' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
