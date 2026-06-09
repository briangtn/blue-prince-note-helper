import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM codes ORDER BY created_at DESC').all())
})

router.post('/', (req, res) => {
  const { value, context, status, notes } = req.body
  const info = db
    .prepare('INSERT INTO codes (value, context, status, notes) VALUES (?, ?, ?, ?)')
    .run(value, context ?? null, status ?? 'pending', notes ?? null)
  res.json(db.prepare('SELECT * FROM codes WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM codes WHERE id = ?').get(req.params.id)
  if (!existing) return res.status(404).json({ error: 'not found' })
  const { value, context, status, notes } = req.body
  db.prepare('UPDATE codes SET value = ?, context = ?, status = ?, notes = ? WHERE id = ?').run(
    value ?? existing.value,
    context ?? existing.context,
    status ?? existing.status,
    notes ?? existing.notes,
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM codes WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM codes WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
