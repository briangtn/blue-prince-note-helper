import { Router } from 'express'
import db from '../db.js'

const router = Router()

// Toutes les positions ayant une combinaison de tableaux.
router.get('/', (req, res) => {
  res.json(db.prepare('SELECT row, col, combos FROM position_tableaux').all())
})

// Upsert des combos d'une position. Si vide → suppression de la ligne.
router.put('/', (req, res) => {
  const { row, col, combos } = req.body
  const clean = (Array.isArray(combos)
    ? combos
        .map((p) => [(p?.[0] || '').trim(), (p?.[1] || '').trim()])
        .filter((p) => p[0] || p[1])
    : []
  ).slice(0, 2) // 2 lettres max par position
  if (clean.length === 0) {
    db.prepare('DELETE FROM position_tableaux WHERE row = ? AND col = ?').run(row, col)
  } else {
    db.prepare(
      `INSERT INTO position_tableaux (row, col, combos)
       VALUES (?, ?, ?)
       ON CONFLICT(row, col) DO UPDATE SET combos = excluded.combos`
    ).run(row, col, JSON.stringify(clean))
  }
  res.json({ ok: true })
})

export default router
