import { Router } from 'express'
import db from '../db.js'
import { colorForName } from '../../src/api/tagColors.js'

const router = Router()

// Garantit l'existence d'un tag (création auto avec couleur stable). Réutilisé
// par la route photos quand on enregistre des tags inédits.
export function ensureTags(names = []) {
  const ins = db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)')
  for (const raw of names) {
    const name = String(raw).trim()
    if (name) ins.run(name, colorForName(name))
  }
}

router.get('/', (_req, res) => {
  res.json(db.prepare('SELECT * FROM tags ORDER BY name COLLATE NOCASE ASC').all())
})

router.post('/', (req, res) => {
  const name = String(req.body.name ?? '').trim()
  if (!name) return res.status(400).json({ error: 'nom manquant' })
  const color = req.body.color || colorForName(name)
  db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)').run(name, color)
  res.json(db.prepare('SELECT * FROM tags WHERE name = ?').get(name))
})

router.put('/:id', (req, res) => {
  const cur = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id)
  if (!cur) return res.status(404).json({ error: 'introuvable' })
  const name = 'name' in req.body ? String(req.body.name).trim() : cur.name
  const color = 'color' in req.body ? req.body.color : cur.color
  db.prepare('UPDATE tags SET name = ?, color = ? WHERE id = ?').run(name, color, req.params.id)
  // Si le nom change, on répercute sur les photos qui le portent.
  if (name !== cur.name) {
    const rows = db.prepare("SELECT id, tags FROM photos WHERE tags LIKE ?").all(`%${cur.name}%`)
    const upd = db.prepare('UPDATE photos SET tags = ? WHERE id = ?')
    for (const r of rows) {
      let arr = []
      try { arr = JSON.parse(r.tags || '[]') } catch {}
      if (arr.includes(cur.name)) upd.run(JSON.stringify(arr.map((t) => (t === cur.name ? name : t))), r.id)
    }
  }
  res.json(db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id))
})

router.delete('/:id', (req, res) => {
  const tag = db.prepare('SELECT * FROM tags WHERE id = ?').get(req.params.id)
  db.prepare('DELETE FROM tags WHERE id = ?').run(req.params.id)
  // Retire le tag des photos qui le portent.
  if (tag) {
    const rows = db.prepare('SELECT id, tags FROM photos WHERE tags LIKE ?').all(`%${tag.name}%`)
    const upd = db.prepare('UPDATE photos SET tags = ? WHERE id = ?')
    for (const r of rows) {
      let arr = []
      try { arr = JSON.parse(r.tags || '[]') } catch {}
      if (arr.includes(tag.name)) upd.run(JSON.stringify(arr.filter((t) => t !== tag.name)), r.id)
    }
  }
  res.json({ ok: true })
})

export default router
