// Re-map les types des rooms importées vers les bons types selon le catalogue connu.
// Lancer : node server/remap-types.js
import db from './db.js'

// Mapping fuzzy (nom importé → [type correct, gem_cost])
// Basé sur les noms du catalogue, avec variantes de casse/espaces
const CATALOG = {
  'entrance hall': ['Hallways', 0],
  'corridor': ['Hallways', 0],
  'hallway': ['Hallways', 0],
  'west wing hall': ['Hallways', 0],
  'east wing hall': ['Hallways', 0],
  'secret passage': ['Hallways', 0],
  'bedroom': ['Bedrooms', 0],
  'guest bedroom': ['Bedrooms', 0],
  'boudoir': ['Bedrooms', 0],
  'spare room': ['Bedrooms', 0],
  "maid's chamber": ['Bedrooms', 0],
  'greenhouse': ['Green rooms', null],
  'courtyard / jardin': ['Green rooms', null],
  'veranda': ['Green rooms', null],
  'aquarium': ['Outer rooms', null],
  'chapel': ['Outer rooms', null],
  'furnace': ['Red rooms', null],
  'tomb': ['Red rooms', null],
  'kitchen': ['Other', null],
  'pantry': ['Other', null],
  'dining room': ['Other', null],
  'drawing room': ['Other', null],
  'parlor': ['Other', null],
  'den': ['Other', null],
  'study': ['Other', null],
  'office': ['Other', null],
  'library': ['Other', null],
  'billiard room': ['Other', null],
  'nook': ['Other', null],
  'storeroom': ['Other', null],
  'workshop': ['Other', null],
  'laboratory': ['Other', null],
  'walk-in-closet': ['Other', null],
  'lavatory': ['Other', null],
  'garage': ['Other', null],
  'hovel': ['Other', null],
}

const rooms = db.prepare('SELECT id, name, type, gem_cost FROM rooms').all()
const update = db.prepare('UPDATE rooms SET type = ?, gem_cost = COALESCE(?, gem_cost) WHERE id = ?')

let updated = 0
for (const r of rooms) {
  const hit = CATALOG[r.name.toLowerCase().trim()]
  if (!hit) continue
  const [type, gem] = hit
  if (r.type === type && (gem == null || String(gem) === r.gem_cost)) continue
  update.run(type, gem != null ? String(gem) : null, r.id)
  console.log(`  ${r.name}: ${r.type} → ${type}${gem != null ? ` (💎 ${gem})` : ''}`)
  updated++
}

console.log(`\nRe-mapping terminé : ${updated} pièces mises à jour sur ${rooms.length}.`)
