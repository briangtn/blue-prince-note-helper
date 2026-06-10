import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Liste les items, du plus récemment modifié au plus ancien.
// ?day=<n> filtre les items trouvés un jour donné.
router.get('/', (req, res) => {
  const { day } = req.query
  if (day != null && day !== '') {
    return res.json(
      db.prepare('SELECT * FROM items WHERE day_found = ? ORDER BY name COLLATE NOCASE ASC').all(Number(day))
    )
  }
  res.json(db.prepare('SELECT * FROM items ORDER BY updated_at DESC').all())
})

router.post('/', (req, res) => {
  const { name, quantity, day_found, notes } = req.body
  const info = db
    .prepare('INSERT INTO items (name, quantity, day_found, notes) VALUES (?, ?, ?, ?)')
    .run(name ?? null, quantity ?? 1, day_found ?? null, notes ?? null)
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  const { name, quantity, day_found, notes } = req.body
  db.prepare(
    'UPDATE items SET name = ?, quantity = ?, day_found = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(name ?? null, quantity ?? 1, day_found ?? null, notes ?? null, req.params.id)
  res.json(db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM items WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'item' AND from_id = ?) OR (to_type = 'item' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
