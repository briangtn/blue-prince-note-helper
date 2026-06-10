import { Router } from 'express'
import db from '../db.js'

const router = Router()

// ingredients est stocké en JSON ([{name, qty}, …]) ; on le re-parse à la lecture
// pour renvoyer un vrai tableau au client.
function hydrate(row) {
  if (!row) return row
  let ingredients = []
  try {
    ingredients = row.ingredients ? JSON.parse(row.ingredients) : []
  } catch {
    ingredients = []
  }
  return { ...row, ingredients: Array.isArray(ingredients) ? ingredients : [] }
}

// Normalise les ingrédients reçus du client en [{name, qty}] propre.
function normalizeIngredients(raw) {
  if (!Array.isArray(raw)) return []
  return raw
    .map((ing) => {
      if (typeof ing === 'string') return { name: ing.trim(), qty: 1 }
      const name = (ing?.name ?? '').trim()
      const qty = Math.max(1, Number(ing?.qty) || 1)
      return { name, qty }
    })
    .filter((ing) => ing.name)
}

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM crafts ORDER BY name COLLATE NOCASE ASC').all().map(hydrate))
})

router.post('/', (req, res) => {
  const { name, ingredients, result_qty, notes } = req.body
  const info = db
    .prepare('INSERT INTO crafts (name, ingredients, result_qty, notes) VALUES (?, ?, ?, ?)')
    .run(name ?? null, JSON.stringify(normalizeIngredients(ingredients)), result_qty ?? 1, notes ?? null)
  res.json(hydrate(db.prepare('SELECT * FROM crafts WHERE id = ?').get(info.lastInsertRowid)))
})

router.put('/:id', (req, res) => {
  const { name, ingredients, result_qty, notes } = req.body
  db.prepare(
    'UPDATE crafts SET name = ?, ingredients = ?, result_qty = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?'
  ).run(name ?? null, JSON.stringify(normalizeIngredients(ingredients)), result_qty ?? 1, notes ?? null, req.params.id)
  res.json(hydrate(db.prepare('SELECT * FROM crafts WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  db.prepare('DELETE FROM crafts WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'craft' AND from_id = ?) OR (to_type = 'craft' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
