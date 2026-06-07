import { Router } from 'express'
import db from '../db.js'

const router = Router()


router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM days ORDER BY day_number DESC').all())
})

router.post('/', (req, res) => {
  const { day_number } = req.body
  db.prepare('INSERT OR IGNORE INTO days (day_number) VALUES (?)').run(day_number)
  res.json(db.prepare('SELECT * FROM days WHERE day_number = ?').get(day_number))
})

// Placements "sticky" (épinglés) : globaux, affichés sur tous les jours.
// ⚠️ À déclarer AVANT la route '/:n' (sinon '/sticky' serait capturé comme un numéro de jour).
const stickyPlacements = () =>
  db.prepare(
    `SELECT s.*, r.name AS room_name, r.type AS room_type, r.chess_pieces AS chess_pieces
     FROM sticky_placements s LEFT JOIN rooms r ON r.id = s.room_id`
  ).all()

router.put('/sticky', (req, res) => {
  const { row, col, room_id, note } = req.body
  db.prepare(
    `INSERT INTO sticky_placements (row, col, room_id, note)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(row, col)
     DO UPDATE SET room_id = excluded.room_id, note = excluded.note`
  ).run(row, col, room_id ?? null, note ?? null)
  res.json({ ok: true })
})

router.delete('/sticky', (req, res) => {
  const { row, col } = req.body
  db.prepare('DELETE FROM sticky_placements WHERE row = ? AND col = ?').run(row, col)
  res.json({ ok: true })
})

router.get('/:n', (req, res) => {
  const n = req.params.n
  const day = db.prepare('SELECT * FROM days WHERE day_number = ?').get(n)
  const placements = db
    .prepare(
      `SELECT p.*, r.name AS room_name, r.type AS room_type, r.chess_pieces AS chess_pieces
       FROM day_placements p LEFT JOIN rooms r ON r.id = p.room_id
       WHERE p.day_number = ?`
    )
    .all(n)
  res.json({ day: day || { day_number: Number(n), overall_notes: null }, placements, sticky: stickyPlacements() })
})

router.put('/:n', (req, res) => {
  const n = req.params.n
  db.prepare('INSERT OR IGNORE INTO days (day_number) VALUES (?)').run(n)
  db.prepare('UPDATE days SET overall_notes = ? WHERE day_number = ?').run(req.body.overall_notes ?? null, n)
  res.json(db.prepare('SELECT * FROM days WHERE day_number = ?').get(n))
})

// Upsert a placement on a cell
router.put('/:n/placement', (req, res) => {
  const n = Number(req.params.n)
  const { row, col, room_id, note } = req.body
  db.prepare('INSERT OR IGNORE INTO days (day_number) VALUES (?)').run(n)
  db.prepare(
    `INSERT INTO day_placements (day_number, row, col, room_id, note)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(day_number, row, col)
     DO UPDATE SET room_id = excluded.room_id, note = excluded.note`
  ).run(n, row, col, room_id ?? null, note ?? null)
  res.json({ ok: true })
})

router.delete('/:n/placement', (req, res) => {
  const { row, col } = req.body
  db.prepare('DELETE FROM day_placements WHERE day_number = ? AND row = ? AND col = ?').run(req.params.n, row, col)
  res.json({ ok: true })
})

export default router
