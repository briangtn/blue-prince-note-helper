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
import people from './routes/people.js'
import notes from './routes/notes.js'
import entities from './routes/entities.js'
import events from './routes/events.js'
import links from './routes/links.js'
import auth from './auth.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(cors())
app.use(express.json({ limit: '5mb' }))

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
app.use('/api/people', people)
app.use('/api/notes', notes)
app.use('/api/entities', entities)
app.use('/api/events', events)
app.use('/api/links', links)

const distPath = join(__dirname, '..', 'dist')
app.use(express.static(distPath))
app.get('*', (req, res) => {
  res.sendFile(join(distPath, 'index.html'))
})

const PORT = process.env.PORT || 3001
server.listen(PORT, () => console.log(`Blue Prince Helper on http://localhost:${PORT} (WS ready)`))
