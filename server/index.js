import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer } from 'ws'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import rooms from './routes/rooms.js'
import codes from './routes/codes.js'
import whiteboard from './routes/whiteboard.js'
import days from './routes/days.js'
import tableaux from './routes/tableaux.js'
import soil from './routes/soil.js'
import people from './routes/people.js'
import notes from './routes/notes.js'
import dictionary from './routes/dictionary.js'
import entities from './routes/entities.js'
import events from './routes/events.js'
import items from './routes/items.js'
import runItems from './routes/runItems.js'
import crafts from './routes/crafts.js'
import links from './routes/links.js'
import photos, { uploadsDir } from './routes/photos.js'
import tags from './routes/tags.js'
import auth from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

// --- Log d'accès : une ligne par requête (qui, quoi, d'où) ---
app.use((req, res, next) => {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '-'
  const at = new Date().toISOString()
  res.on('finish', () => {
    console.log(`[access] ${at} ${ip} ${req.method} ${req.originalUrl} -> ${res.statusCode}`)
  })
  next()
})

// --- WebSocket broadcast ---
const server = createServer(app)
const wss = new WebSocketServer({ server })

function broadcast(channel) {
  const msg = JSON.stringify({ channel })
  for (const ws of wss.clients) {
    if (ws.readyState === 1) ws.send(msg)
  }
}

app.get('/healthz', (_req, res) => res.json({ status: 'ok' }))

// Fichiers photos servis en statique (hors /api donc sans auth) : les balises
// <img> ne peuvent pas porter l'en-tête Basic. Les noms de fichiers sont des UUID.
app.use('/uploads', express.static(uploadsDir))

app.use('/api', auth)

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.user || null, role: req.role || 'rw' })
})

// Middleware : sur toute mutation (POST/PUT/DELETE), broadcast le canal
app.use('/api', (req, res, next) => {
  if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
    const origJson = res.json.bind(res)
    res.json = (data) => {
      // canal = premier segment après /api/ (req.originalUrl=/api/rooms/xxx → rooms)
      const channel = req.originalUrl.replace(/^\/api\//, '').split('/')[0] || 'unknown'
      broadcast(channel)
      return origJson(data)
    }
  }
  next()
})

app.use('/api/rooms', rooms)
app.use('/api/codes', codes)
app.use('/api/whiteboard', whiteboard)
app.use('/api/days', days)
app.use('/api/tableaux', tableaux)
app.use('/api/soil', soil)
app.use('/api/people', people)
app.use('/api/notes', notes)
app.use('/api/dictionary', dictionary)
app.use('/api/entities', entities)
app.use('/api/events', events)
app.use('/api/items', items)
app.use('/api/run-items', runItems)
app.use('/api/crafts', crafts)
app.use('/api/links', links)
app.use('/api/photos', photos)
app.use('/api/tags', tags)

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Blue Prince Helper on http://localhost:${PORT} (WS ready)`))
