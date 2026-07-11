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

  -- Placements "sticky" (épinglés) : globaux, affichés sur TOUS les jours à une position fixe.
  CREATE TABLE IF NOT EXISTS sticky_placements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    room_id INTEGER,
    note TEXT,
    UNIQUE(row, col)
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

  CREATE TABLE IF NOT EXISTS dictionary (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT,
    definition TEXT,
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

  -- Liste de tâches (todo list) : intitulé + done (0/1).
  CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    done INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Combinaisons de tableaux par POSITION de la grille (pas par pièce).
  -- combos = JSON [["Stage","Sage"], …] ; la lettre trouvée est dérivée côté client.
  CREATE TABLE IF NOT EXISTS position_tableaux (
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    combos TEXT,
    PRIMARY KEY (row, col)
  );

  -- Qualité du sol par POSITION de la grille (identique tous les jours).
  -- soil ∈ {sterile, poor, good, rich}.
  CREATE TABLE IF NOT EXISTS position_soil (
    row INTEGER NOT NULL,
    col INTEGER NOT NULL,
    soil TEXT,
    PRIMARY KEY (row, col)
  );

  -- Items trouvés (inventaire). quantity = nombre possédé.
  -- day_found = jour où l'item a été trouvé (optionnel, lié à days.day_number).
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    day_found INTEGER,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Items trouvés pendant une run (un jour donné). Indépendant de l'inventaire
  -- permanent : on peut retrouver le même item lors de plusieurs runs.
  CREATE TABLE IF NOT EXISTS run_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_number INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Crafts (recettes) découverts. ingredients = JSON [{name, qty}, …].
  -- result_qty = nombre d'items produits par le craft.
  CREATE TABLE IF NOT EXISTS crafts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ingredients TEXT,
    result_qty INTEGER DEFAULT 1,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Photothèque : une ligne par photo importée. Le fichier vit sur disque
  -- (dossier uploads, à côté de la DB) ; on ne stocke ici que les métadonnées.
  -- filename = nom du fichier sur disque (unique) ; original_name = nom d'origine.
  CREATE TABLE IF NOT EXISTS photos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT,
    mime TEXT,
    size INTEGER DEFAULT 0,
    caption TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Catalogue des tags (façon labels GitHub) : nom unique + couleur.
  -- Les photos référencent les tags par nom (photos.tags = JSON de noms).
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Migration : conduite d'énergie (booléen 0/1) — la pièce transmet le courant
if (!roomCols.includes('power_conduit')) {
  db.exec('ALTER TABLE rooms ADD COLUMN power_conduit INTEGER DEFAULT 0')
}

// Migration : date de fin pour les événements (permet les durées / la vue timeline)
const eventCols = db.prepare('PRAGMA table_info(events)').all().map((c) => c.name)
if (!eventCols.includes('end_date')) {
  db.exec('ALTER TABLE events ADD COLUMN end_date TEXT')
}

// Migration : tags (JSON array) + ordre d'affichage des photos (drag & drop).
const photoCols = db.prepare('PRAGMA table_info(photos)').all().map((c) => c.name)
if (!photoCols.includes('tags')) {
  db.exec('ALTER TABLE photos ADD COLUMN tags TEXT')
}
if (!photoCols.includes('sort_order')) {
  db.exec('ALTER TABLE photos ADD COLUMN sort_order INTEGER DEFAULT 0')
}

// Migration : ordre d'affichage par lien (réordonner les photos d'une entité).
const linkCols = db.prepare('PRAGMA table_info(links)').all().map((c) => c.name)
if (!linkCols.includes('sort_order')) {
  db.exec('ALTER TABLE links ADD COLUMN sort_order INTEGER DEFAULT 0')
}

// Migration : nature d'une entrée du dictionnaire (mot connu / préfixe / suffixe).
const dictCols = db.prepare('PRAGMA table_info(dictionary)').all().map((c) => c.name)
if (!dictCols.includes('kind')) {
  db.exec("ALTER TABLE dictionary ADD COLUMN kind TEXT DEFAULT 'word'")
  db.exec("UPDATE dictionary SET kind = 'word' WHERE kind IS NULL")
}

// Migration : cellule où l'on a dormi ce jour (une seule par jour, position sur la grille).
const dayCols = db.prepare('PRAGMA table_info(days)').all().map((c) => c.name)
if (!dayCols.includes('slept_row')) {
  db.exec('ALTER TABLE days ADD COLUMN slept_row INTEGER')
}
if (!dayCols.includes('slept_col')) {
  db.exec('ALTER TABLE days ADD COLUMN slept_col INTEGER')
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

// Seed des pièces fixes (Antechamber, Entrance Hall) en placements sticky à leur
// position par défaut (grille 9×5 : Antechamber en haut-centre, Entrance Hall en bas-centre).
// Adossés à de vraies pièces pour être cliquables / liables comme n'importe quelle pièce.
// Garde-fou idempotent : on ne seede qu'au tout premier boot (table sticky vide).
const stickySeeded = db.prepare('SELECT COUNT(*) AS c FROM sticky_placements').get().c
if (stickySeeded === 0) {
  const ensureRoom = (name) => {
    let room = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name)
    if (!room) {
      const info = lookupRoom(name)
      const r = db.prepare('INSERT INTO rooms (name, type) VALUES (?, ?)').run(name, info?.type || 'Blueprints')
      room = { id: r.lastInsertRowid }
    }
    return room.id
  }
  const insertSticky = db.prepare('INSERT OR IGNORE INTO sticky_placements (row, col, room_id) VALUES (?, ?, ?)')
  insertSticky.run(0, 2, ensureRoom('Antechamber'))   // haut-centre
  insertSticky.run(8, 2, ensureRoom('Entrance Hall')) // bas-centre
}

export default db
