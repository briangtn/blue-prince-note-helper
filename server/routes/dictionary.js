import { Router } from 'express'
import db from '../db.js'

const router = Router()

// nature d'une entrée : mot connu, préfixe ou suffixe (par défaut : mot)
const KINDS = new Set(['word', 'prefix', 'suffix'])
const normKind = (k) => (KINDS.has(k) ? k : 'word')

router.get('/', (req, res) => {
  res.json(
    db.prepare("SELECT * FROM dictionary ORDER BY term COLLATE NOCASE ASC").all()
  )
})

router.post('/', (req, res) => {
  const info = db
    .prepare('INSERT INTO dictionary (term, definition, kind) VALUES (?, ?, ?)')
    .run(req.body.term ?? null, req.body.definition ?? null, normKind(req.body.kind))
  res.json(db.prepare('SELECT * FROM dictionary WHERE id = ?').get(info.lastInsertRowid))
})

router.put('/:id', (req, res) => {
  db.prepare('UPDATE dictionary SET term = ?, definition = ?, kind = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(
    req.body.term ?? null,
    req.body.definition ?? null,
    normKind(req.body.kind),
    req.params.id
  )
  res.json(db.prepare('SELECT * FROM dictionary WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM dictionary WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

export default router
