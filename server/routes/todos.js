import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM todos ORDER BY done ASC, created_at ASC').all())
})

router.post('/', (req, res) => {
  const info = db.prepare('INSERT INTO todos (text) VALUES (?)').run(req.body.text ?? '')
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'not found' })
  const text = req.body.text ?? cur.text
  const done = req.body.done != null ? (req.body.done ? 1 : 0) : cur.done
  db.prepare('UPDATE todos SET text = ?, done = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(text, done, req.params.id)
  res.json(db.prepare('SELECT * FROM todos WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM todos WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
