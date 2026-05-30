import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM notes ORDER BY updated_at DESC').all())
})

router.post('/', (req, res) => {
  const info = db
    .prepare('INSERT INTO notes (title, body) VALUES (?, ?)')
    .run(req.body.title ?? null, req.body.body ?? null)
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  db.prepare('UPDATE notes SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    req.body.title ?? null,
    req.body.body ?? null,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM notes WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'note' AND from_id = ?) OR (to_type = 'note' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
