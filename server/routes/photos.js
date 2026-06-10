import { Router } from 'express'
import multer from 'multer'
import { fileURLToPath } from 'url'
import { dirname, join, extname } from 'path'
import { existsSync, mkdirSync, unlinkSync } from 'fs'
import { randomUUID } from 'crypto'
import db from '../db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Le dossier uploads vit à côté de la DB (même volume / PVC en prod).
const dbPath = process.env.DB_PATH || join(__dirname, '..', '..', 'data', 'blueprince.db')
export const uploadsDir = process.env.UPLOADS_DIR || join(dirname(dbPath), 'uploads')
if (!existsSync(uploadsDir)) mkdirSync(uploadsDir, { recursive: true })

// Limite de stockage applicative (garde-fou avant de remplir le volume).
// Défaut : 100 Go. Surchargeable via STORAGE_LIMIT_BYTES.
export const STORAGE_LIMIT = Number(process.env.STORAGE_LIMIT_BYTES) || 100 * 1024 * 1024 * 1024

const router = Router()

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${extname(file.originalname || '').toLowerCase()}`),
  }),
  // garde-fou par fichier (un seul upload ne peut pas dépasser la limite globale)
  limits: { fileSize: STORAGE_LIMIT },
  fileFilter: (_req, file, cb) => cb(null, /^image\//.test(file.mimetype)),
})

function usedBytes() {
  return db.prepare('SELECT COALESCE(SUM(size), 0) AS s FROM photos').get().s
}

function withUrl(p) {
  return p && { ...p, url: `/uploads/${p.filename}` }
}

// Usage du stockage : { used, limit } en octets.
router.get('/usage', (_req, res) => {
  res.json({ used: usedBytes(), limit: STORAGE_LIMIT })
})

// Liste les photos. ?entity_type=&entity_id= filtre celles liées à une entité.
router.get('/', (req, res) => {
  const { entity_type, entity_id } = req.query
  if (entity_type && entity_id != null && entity_id !== '') {
    const rows = db
      .prepare(
        `SELECT p.*, l.id AS link_id FROM photos p
         JOIN links l ON (
           (l.to_type = 'photo' AND l.to_id = p.id AND l.from_type = ? AND l.from_id = ?)
           OR (l.from_type = 'photo' AND l.from_id = p.id AND l.to_type = ? AND l.to_id = ?)
         )
         ORDER BY p.created_at DESC`
      )
      .all(entity_type, entity_id, entity_type, entity_id)
    return res.json(rows.map(withUrl))
  }
  res.json(db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all().map(withUrl))
})

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier image manquant ou invalide' })

  // Garde-fou stockage : refuse si on dépasse la limite globale.
  if (usedBytes() + req.file.size > STORAGE_LIMIT) {
    try { unlinkSync(req.file.path) } catch {}
    return res.status(413).json({ error: 'Limite de stockage atteinte' })
  }

  const info = db
    .prepare('INSERT INTO photos (filename, original_name, mime, size, caption) VALUES (?, ?, ?, ?, ?)')
    .run(req.file.filename, req.file.originalname ?? null, req.file.mimetype ?? null, req.file.size ?? 0, req.body.caption ?? null)
  res.json(withUrl(db.prepare('SELECT * FROM photos WHERE id = ?').get(info.lastInsertRowid)))
})

router.put('/:id', (req, res) => {
  const { caption } = req.body
  db.prepare('UPDATE photos SET caption = ? WHERE id = ?').run(caption ?? null, req.params.id)
  res.json(withUrl(db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id)))
})

router.delete('/:id', (req, res) => {
  const id = req.params.id
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(id)
  if (photo) {
    try { unlinkSync(join(uploadsDir, photo.filename)) } catch {}
  }
  db.prepare('DELETE FROM photos WHERE id = ?').run(id)
  db.prepare("DELETE FROM links WHERE (from_type = 'photo' AND from_id = ?) OR (to_type = 'photo' AND to_id = ?)").run(id, id)
  res.json({ ok: true })
})

export default router
