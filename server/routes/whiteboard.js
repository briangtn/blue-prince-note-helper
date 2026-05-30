import { Router } from 'express'
import db from '../db.js'

const router = Router()

router.get('/', (req, res) => {
  const nodes = db.prepare('SELECT * FROM whiteboard_nodes').all()
  const edges = db.prepare('SELECT * FROM whiteboard_edges').all()
  res.json({ nodes, edges })
})

// Replace the whole board (simple full-sync from client)
router.put('/', (req, res) => {
  const { nodes = [], edges = [] } = req.body
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM whiteboard_nodes').run()
    db.prepare('DELETE FROM whiteboard_edges').run()
    const ni = db.prepare('INSERT INTO whiteboard_nodes (id, label, type, pos_x, pos_y, data) VALUES (?, ?, ?, ?, ?, ?)')
    for (const n of nodes) {
      ni.run(n.id, n.label ?? '', n.type ?? 'default', n.pos_x ?? 0, n.pos_y ?? 0, n.data ?? null)
    }
    const ei = db.prepare('INSERT INTO whiteboard_edges (id, source, target, label) VALUES (?, ?, ?, ?)')
    for (const e of edges) {
      ei.run(e.id, e.source, e.target, e.label ?? null)
    }
  })
  tx()
  res.json({ ok: true })
})

export default router
