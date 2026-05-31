import Database from 'better-sqlite3'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { lookupRoom } from '../src/api/roomCatalog.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dbPath = process.env.DB_PATH || join(__dirname, '..', 'data', 'blueprince.db')
const db = new Database(dbPath)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS room_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT DEFAULT '#64748b'
  );

  CREATE TABLE IF NOT EXISTS rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    position TEXT,
    tableau_combo TEXT,
    chess_pieces TEXT,
    objects TEXT,
    letters TEXT,
    days_seen TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS codes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    value TEXT NOT NULL,
    context TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS whiteboard_nodes (
    id TEXT PRIMARY KEY,
    label TEXT NOT NULL,
    type TEXT DEFAULT 'default',
    pos_x REAL,
    pos_y REAL,
    data TEXT
  );

  CREATE TABLE IF NOT EXISTS whiteboard_edges (
    id TEXT PRIMARY KEY,
    source TEXT NOT NULL,
    target TEXT NOT NULL,
    label TEXT
  );

  CREATE TABLE IF NOT EXISTS days (
    day_number INTEGER PRIMARY KEY,
    overall_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS day_placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_number INTEGER NOT NULL,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    room_id INTEGER,
    note TEXT,
    UNIQUE(day_number, row, col)
  );

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    role TEXT,
    day_met INTEGER,
    status TEXT,
    notes TEXT,
    tree_x REAL,
    tree_y REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS entities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    date TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Liens universels entre n'importe quelles entités
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_type TEXT NOT NULL,
    from_id INTEGER NOT NULL,
    to_type TEXT NOT NULL,
    to_id INTEGER NOT NULL,
    label TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`)

// Migration : combinaisons de tableaux structurées (2 combos de 2) en JSON
const roomCols = db.prepare('PRAGMA table_info(rooms)').all().map((c) => c.name)
if (!roomCols.includes('tableau_combos')) {
  db.exec('ALTER TABLE rooms ADD COLUMN tableau_combos TEXT')
  // migration depuis l'ancien champ texte : on découpe par virgule en paires
  const rows = db.prepare("SELECT id, tableau_combo FROM rooms WHERE tableau_combo IS NOT NULL AND tableau_combo != ''").all()
  const upd = db.prepare('UPDATE rooms SET tableau_combos = ? WHERE id = ?')
  for (const r of rows) {
    const parts = r.tableau_combo.split(',').map((s) => s.trim()).filter(Boolean)
    const combos = []
    for (let i = 0; i < parts.length && combos.length < 2; i += 2) combos.push([parts[i], parts[i + 1] || ''])
    upd.run(JSON.stringify(combos), r.id)
  }
}

if (!roomCols.includes('gem_cost')) {
  db.exec('ALTER TABLE rooms ADD COLUMN gem_cost TEXT')
}

// Seed predefined room types (schéma wiki : 7 catégories = couleur de bordure du jeu)
const defaultTypes = [
  ['Blueprints', '#4B7FBF'],
  ['Bedrooms', '#9B72CF'],
  ['Hallways', '#E8913A'],
  ['Green rooms', '#5BAD6E'],
  ['Shops', '#D4A843'],
  ['Red rooms', '#C85454'],
  ['Secret rooms', '#6B7280'],
]
const count = db.prepare('SELECT COUNT(*) AS c FROM room_types').get().c
if (count === 0) {
  const insert = db.prepare('INSERT INTO room_types (name, color) VALUES (?, ?)')
  for (const [name, color] of defaultTypes) insert.run(name, color)
}

// Migration idempotente vers le schéma wiki des 7 catégories.
// Garde-fou : on ne migre que si l'ancien type 'Outer rooms' existe encore.
const hasOuter = db.prepare("SELECT 1 FROM room_types WHERE name = 'Outer rooms'").get()
if (hasOuter) {
  const migrate = db.transaction(() => {
    // 1. Aligner / créer les 7 types cibles
    const upsertType = db.prepare(`
      INSERT INTO room_types (name, color) VALUES (?, ?)
      ON CONFLICT(name) DO UPDATE SET color = excluded.color
    `)
    for (const [name, color] of defaultTypes) upsertType.run(name, color)

    // 2. Recatégoriser chaque salle via le catalogue (sinon Blueprints par défaut)
    const rooms = db.prepare('SELECT id, name FROM rooms').all()
    const setType = db.prepare('UPDATE rooms SET type = ? WHERE id = ?')
    for (const r of rooms) {
      const hit = lookupRoom(r.name)
      setType.run(hit?.type || 'Blueprints', r.id)
    }

    // 3. Remapper les éventuels types résiduels puis supprimer les anciens types
    db.prepare("UPDATE rooms SET type = 'Secret rooms' WHERE type IN ('Outer rooms', 'Founds')").run()
    db.prepare("UPDATE rooms SET type = 'Blueprints' WHERE type = 'Other'").run()
    db.prepare("DELETE FROM room_types WHERE name IN ('Outer rooms', 'Founds', 'Other')").run()
  })
  migrate()
}

export default db
