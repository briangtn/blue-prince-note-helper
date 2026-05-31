import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM entities ORDER BY updated_at DESC').all())
})

router.post('/', (req, res) => {
  const info = db
    .prepare('INSERT INTO entities (title, description) VALUES (?, ?)')
    .run(req.body.title ?? null, req.body.description ?? null)
  res.json(db.prepare('SELECT * FROM entities WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  db.prepare('UPDATE entities SET title = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    req.body.title ?? null,
    req.body.description ?? null,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM entities WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM entities WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'entity' AND from_id = ?) OR (to_type = 'entity' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
