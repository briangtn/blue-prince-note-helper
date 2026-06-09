import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM dictionary ORDER BY term COLLATE NOCASE ASC').all())
})

router.post('/', (req, res) => {
  const info = db
    .prepare('INSERT INTO dictionary (term, definition) VALUES (?, ?)')
    .run(req.body.term ?? null, req.body.definition ?? null)
  res.json(db.prepare('SELECT * FROM dictionary WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  db.prepare('UPDATE dictionary SET term = ?, definition = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    req.body.term ?? null,
    req.body.definition ?? null,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM dictionary WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM dictionary WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
