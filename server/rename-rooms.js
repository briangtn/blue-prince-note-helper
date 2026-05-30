// Renomme les rooms importées vers le nom original exact du jeu.
// Lancer : node server/rename-rooms.js
import db from './db.js'

const RENAMES = {
  'Guest bedroom': 'Guest Bedroom',
  'Spare room': 'Spare Room',
  'Walk-in-closet': 'Walk-in Closet',
  'Courtyard / Jardin': 'Courtyard',
  'Billiard Room': 'Billiards Room',
}

const update = db.prepare('UPDATE rooms SET name = ? WHERE name = ?')
let n = 0
for (const [from, to] of Object.entries(RENAMES)) {
  const info = update.run(to, from)
  if (info.changes) { console.log(`  ${from} → ${to}`); n++ }
}
console.log(`\n${n} pièces renommées.`)
