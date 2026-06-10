import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Enregistre l'item dans l'inventaire permanent (« items connus ») s'il n'y est
// pas encore — découvrir un item pendant une run le rend connu pour toujours.
function ensureKnown(name, day_number) {
  const existing = db.prepare('SELECT id FROM items WHERE name = ? COLLATE NOCASE').get(name)
  if (!existing) {
    db.prepare('INSERT INTO items (name, quantity, day_found) VALUES (?, 0, ?)').run(name, day_number ?? null)
  }
}

// ?day=<n> : items trouvés pendant la run du jour n.
router.get('/', (req, res) => {
  const { day } = req.query
  if (day != null && day !== '') {
    return res.json(
      db.prepare('SELECT * FROM run_items WHERE day_number = ? ORDER BY created_at DESC').all(Number(day))
    )
  }
  res.json(db.prepare('SELECT * FROM run_items ORDER BY created_at DESC').all())
})

router.post('/', (req, res) => {
  const { day_number, name, quantity } = req.body
  const n = (name ?? '').trim()
  if (day_number == null || !n) return res.status(400).json({ error: 'day_number et name requis' })
  const qty = Number(quantity) || 1
  // Incrémente si l'item existe déjà pour cette run, sinon l'ajoute.
  const existing = db.prepare('SELECT * FROM run_items WHERE day_number = ? AND name = ? COLLATE NOCASE').get(day_number, n)
  let row
  if (existing) {
    db.prepare('UPDATE run_items SET quantity = quantity + ? WHERE id = ?').run(qty, existing.id)
    row = db.prepare('SELECT * FROM run_items WHERE id = ?').get(existing.id)
  } else {
    const info = db.prepare('INSERT INTO run_items (day_number, name, quantity) VALUES (?, ?, ?)').run(day_number, n, qty)
    row = db.prepare('SELECT * FROM run_items WHERE id = ?').get(info.lastInsertRowid)
  }
  ensureKnown(n, day_number)
  res.json(row)
})

router.put('/:id', (req, res) => {
  const qty = Number(req.body.quantity)
  if (qty <= 0) {
    db.prepare('DELETE FROM run_items WHERE id = ?').run(req.params.id)
    return res.json({ ok: true, deleted: true })
  }
  db.prepare('UPDATE run_items SET quantity = ? WHERE id = ?').run(qty, req.params.id)
  res.json(db.prepare('SELECT * FROM run_items WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM run_items WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
