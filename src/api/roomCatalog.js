// Catalogue de pièces Blue Prince (connaissances du jeu).
// Quand tu tapes EXACTEMENT le nom d'une pièce, l'app remplit auto type + coût gemmes.
// type = catégorie (couleur de drafting) ; gem = coût en gemmes pour drafter (null = inconnu/gratuit).
// ⚠️ Coûts au mieux de mes connaissances — à corriger en jeu si besoin.
//
// Catégories utilisées (= types prédéfinis de l'app) :
//   Bedrooms, Hallways, Green rooms, Shops, Red rooms, Outer rooms, Other
const RAW = {
  // --- Hallways ---
  'Entrance Hall': ['Hallways', 0],
  'Corridor': ['Hallways', 0],
  'Hallway': ['Hallways', 0],
  'Passageway': ['Hallways', 0],
  'West Wing Hall': ['Hallways', 0],
  'East Wing Hall': ['Hallways', 0],
  'Great Hall': ['Hallways', 0],
  'Foyer': ['Hallways', 0],
  'Secret Passage': ['Hallways', 0],
  'Spiral Staircase': ['Hallways', 0],

  // --- Bedrooms ---
  'Bedroom': ['Bedrooms', 0],
  'Master Bedroom': ['Bedrooms', 0],
  'Guest Bedroom': ['Bedrooms', 0],
  'Boudoir': ['Bedrooms', 0],
  'Nursery': ['Bedrooms', 0],
  'Bunk Room': ['Bedrooms', 0],
  'Servants Quarters': ['Bedrooms', 0],
  "Maid's Chamber": ['Bedrooms', 0],
  'Her Ladyship Chamber': ['Bedrooms', 0],
  'Spare Room': ['Bedrooms', 0],

  // --- Green rooms (nature / végétal) ---
  'Greenhouse': ['Green rooms', null],
  'Conservatory': ['Green rooms', null],
  'Courtyard': ['Green rooms', null],
  'Courtyard / Jardin': ['Green rooms', null],
  'Veranda': ['Green rooms', null],
  'Patio': ['Green rooms', null],
  'Terrace': ['Green rooms', null],
  'Garden': ['Green rooms', null],

  // --- Shops (coûtent des gemmes) ---
  'Commissary': ['Shops', null],
  'Showroom': ['Shops', null],
  'Locksmith': ['Shops', null],
  'Kitchenette': ['Shops', null],

  // --- Red rooms ---
  'Furnace': ['Red rooms', null],
  'Tomb': ['Red rooms', null],
  'Boiler Room': ['Red rooms', null],

  // --- Outer rooms (doivent toucher le bord) ---
  'Chapel': ['Outer rooms', null],
  'Cloister': ['Outer rooms', null],
  'Shrine': ['Outer rooms', null],
  'Morning Room': ['Outer rooms', null],
  'Aquarium': ['Outer rooms', null],

  // --- Other ---
  'Kitchen': ['Other', null],
  'Pantry': ['Other', null],
  'Dining Room': ['Other', null],
  'Drawing Room': ['Other', null],
  'Parlor': ['Other', null],
  'Den': ['Other', null],
  'Study': ['Other', null],
  'Office': ['Other', null],
  'Library': ['Other', null],
  'Billiards Room': ['Other', null],
  'Nook': ['Other', null],
  'Storeroom': ['Other', null],
  'Workshop': ['Other', null],
  'Laboratory': ['Other', null],
  'Walk-in Closet': ['Other', null],
  'Lavatory': ['Other', null],
  'Garage': ['Other', null],
  'Hovel': ['Other', null],
}

// index insensible à la casse / espaces
const INDEX = {}
for (const [name, [type, gem]] of Object.entries(RAW)) {
  INDEX[name.toLowerCase().trim()] = { name, type, gem }
}

export function lookupRoom(name) {
  if (!name) return null
  return INDEX[name.toLowerCase().trim()] || null
}

export const KNOWN_ROOM_NAMES = Object.keys(RAW)
