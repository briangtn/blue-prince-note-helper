import { Router } from 'express'
import db from '../db.js'

const router = Router()
const FIELDS = ['name', 'role', 'day_met', 'status', 'notes']

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM people ORDER BY name').all())
})

router.post('/', (req, res) => {
  const vals = FIELDS.map((f) => req.body[f] ?? null)
  const info = db
    .prepare(`INSERT INTO people (${FIELDS.join(',')}) VALUES (${FIELDS.map(() => '?').join(',')})`)
    .run(...vals)
  res.json(db.prepare('SELECT * FROM people WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const vals = FIELDS.map((f) => req.body[f] ?? null)
  db.prepare(`UPDATE people SET ${FIELDS.map((f) => `${f} = ?`).join(',')} WHERE id = ?`).run(...vals, req.params.id)
  res.json(db.prepare('SELECT * FROM people WHERE id = ?').get(req.params.id))
})

// Sauvegarde de la position dans l'arbre (mode libre)
router.put('/:id/position', (req, res) => {
  db.prepare('UPDATE people SET tree_x = ?, tree_y = ? WHERE id = ?').run(
    req.body.tree_x ?? null,
    req.body.tree_y ?? null,
    req.params.id
  )
  res.json({ ok: true })
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM people WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'person' AND from_id = ?) OR (to_type = 'person' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
