import { Router } from 'express'
import db from '../db.js'

const router = Router()

const VALID = new Set(['sterile', 'poor', 'good', 'rich'])

// Toutes les positions ayant une qualité de sol définie.
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT row, col, soil FROM position_soil').all())
})

// Upsert de la qualité de sol d'une position. Valeur vide / invalide → suppression.
router.put('/', (req, res) => {
  const { row, col, soil } = req.body
  if (!VALID.has(soil)) {
    db.prepare('DELETE FROM position_soil WHERE row = ? AND col = ?').run(row, col)
  } else {
    db.prepare(
      `INSERT INTO position_soil (row, col, soil)
       VALUES (?, ?, ?)
       ON CONFLICT(row, col) DO UPDATE SET soil = excluded.soil`
    ).run(row, col, soil)
  }
  res.json({ ok: true })
})

export default router
