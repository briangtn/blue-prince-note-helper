// Import ponctuel des données depuis la base Notion "Blue prince".
// Lancer avec : node server/import-notion.js
// Idempotent : ne réinsère pas une pièce/personne déjà présente (par nom).
import db from './db.js'

// --- PIÈCES (depuis la base Notion "Pièces") ---
// type laissé à "Other" : Notion n'a pas de colonne type. À recatégoriser dans l'app.
const rooms = [
  { name: 'Kitchen', objects: 'Banane, Sandwich, Soupe à la tomate', notes: "Cuisine, ya pas d'eau\nRobinet sans eau\nTomate : +5 pas pour chaque redroom\nBanane : +3\nSandwich : +15\nPlat principal: +20 si on a la dining room" },
  { name: 'Bedroom', chess_pieces: 'Pion', tableau_combo: 'Mainquiprient?, crowbar, Pine, Pin', notes: 'Carte postale redington\nDoigt qui va vers le bas' },
  { name: 'Drawing Room', chess_pieces: 'Pion', tableau_combo: 'tente, ten(10)', notes: 'Probablement enigme avec les fleches sur les dessins' },
  { name: 'Spare room', chess_pieces: 'N/A', notes: 'Salle avec peinture' },
  { name: 'Guest bedroom', chess_pieces: 'Pion', objects: 'Keycard, Clé de voiture, Compass', tableau_combo: 'Tier, Tie, Bat, Bath', notes: 'lettre : lord evanson, lettre où ça parle des échecs' },
  { name: 'Parlor', tableau_combo: 'Bath, Bat', notes: 'devenu funeral parlor\nénigme avec les boites' },
  { name: 'Den', chess_pieces: 'Pion', objects: 'Gemme', tableau_combo: 'Bride, Bridge, Road, Rod', notes: "Salle avec bcp d'horloge\nOn dirait qu'il y a un coffre entre les deux signes" },
  { name: 'Boudoir', objects: 'Gemme, Clé', notes: "Dans boudoir, il y a l'enveloppe 4" },
  { name: 'Dining Room', chess_pieces: 'Pion', objects: 'Clé de voiture', tableau_combo: 'Pine, Pin' },
  { name: 'Storeroom', chess_pieces: 'Pion', objects: 'Clé, Masse', tableau_combo: 'Mainquiprient?, crowbar', notes: 'Salle avec twitter' },
  { name: 'Chapel', chess_pieces: 'Fou', notes: 'ordre des vitraux : 7 (entrée) 5, 2, 3, 6, 4, 1' },
  { name: 'Entrance Hall', tableau_combo: 'Ace, Face' },
  { name: 'Billiard Room', objects: 'Keycard' },
  { name: 'Office', notes: "On peut lire les mails depuis Office\ndoigt vers la gauche\nil y a un coffre dans le buste droit code qu'on a pas\nC'est pas 9083 (conference room)" },
  { name: 'Corridor', chess_pieces: 'N/A' },
  { name: 'Hovel', notes: 'Info Hovel : 2 starting rooms, 45292\n7/5/90 : tested my full house' },
  { name: 'Veranda' },
  { name: 'Nook', chess_pieces: 'Tour', tableau_combo: 'Peak, Pea' },
  { name: 'Study', tableau_combo: 'Manteau, Côte' },
  { name: 'Library', objects: 'Loupe' },
  { name: 'Workshop', objects: 'Batterie', tableau_combo: 'Peak, Pea', notes: 'On a vu un T, E (jour 8), A (jour 14)\nPartition 8 (J14)\non sait pas trop pourquoi ça change' },
  { name: 'Pantry', chess_pieces: 'N/A', objects: 'Fruits, Pieces', tableau_combo: 'Clock, Lock', notes: 'Salle avec la quête 5 bananes, 5 pommes et 5 oranges' },
  { name: 'Laboratory', notes: '1 = PU\n2 = S\n3 = H\n4 = Th\n5 = Re\n6 = Eu\n7 = Pa\n8 = F\n9 = Te\n10 = Rn\n11 = I\n12 = Ne\nPush Three Up After nine' },
  { name: 'Walk-in-closet', chess_pieces: 'Pion', objects: 'Safe deposit box' },
  { name: 'Greenhouse', objects: 'Partition, Dighole' },
  { name: 'Furnace', objects: 'Dighole' },
  { name: 'Aquarium' },
  { name: 'Tomb' },
  { name: 'Secret Passage', tableau_combo: 'Lock, Clock' },
  { name: 'Garage', objects: 'Clé, Disquette', notes: 'Faut rétablir le courant pour\nTableau avec dame de carreau\nDemande la clé de garage (Dining Room)\n3 clés\nImmat de la voiture : SWNSNG\n14227 Sandy Heights' },
  { name: 'Courtyard / Jardin', objects: 'Masse, Pelle', notes: 'Salle avec parfois une keycard' },
  { name: 'Lavatory' },
  { name: 'West Wing Hall', notes: '(photo dans Notion)' },
]

// --- PERSONNAGES (depuis la base Notion "Personnages") ---
const people = [
  { name: "Maid's chamber", notes: "MILA sur la statue = statue dans l'église 5 (réf. Chapel)" },
  { name: 'Mary Matthew Jones', notes: "Disparue et autrice du livre Red Prince, c'est le nom de scène de Marion Marigold" },
  { name: 'Marion Marigold', notes: 'Autrice Swim bird (maman ?)\nARTICLE: Marigold wins herald literary honor : AUG 22 85\nSon publisher était ruffington press\nDisparue depuis le 22 février 87 (environ, vendredi 3:45PM)' },
  { name: 'Lady Epsen (schoolhouse)', notes: "Elle aimait bien l'astronomy" },
  { name: 'Sinclair Family', notes: '?' },
  { name: 'Daniel', notes: 'papa ?' },
  { name: 'bridgette (office)', notes: '???' },
  { name: 'The Children of black water', notes: "Aussi appelé RLCF (mais on sait pas pourquoi)\nArticle publié sur un attentat le NOV 11 - 86\nPotentiel membre : Caleb Manning (arrêté suite à l'attentat) et c'était le mentor de Marigold" },
  { name: 'Courntney', notes: 'Complot sur la disparition de Mary Matthew Jones qui serait volontaire et responsable du vol de la couronne royale (Maybe lié aux Children of black water)' },
  { name: 'Mrs Peterson', notes: 'Lien de famille avec nous (maman ? / Nourrice)' },
  { name: 'Simon Petterson Jones', notes: 'C nous (le joueur)' },
  { name: 'Hartley', notes: 'Valet de la semaine de la mort du tonton' },
  { name: 'Randolph M. (labo)', notes: '' },
  { name: 'Mr Revane (hovel)', notes: 'Viré le 20 mars par Anne Babage' },
  { name: 'Herbert J (Jones?) Sinclair', notes: 'Mort le 4 novembre 93, c tonton' },
  { name: 'Kimberly Thompson (labo)', notes: 'Liée au Syncalab' },
  { name: 'Anne Babage', notes: 'Tante ? Chef du staff ?' },
  { name: 'Herbert (Junior?)', notes: 'Notre frère ?' },
  { name: 'Christophe', notes: 'Maybe employé de Anne Babage - Livreur de voiture' },
  { name: 'HS', notes: 'Il aime bien la "Her Ladyship"' },
]

// --- CODES potentiels (depuis le texte libre Notion) ---
const codes = [
  { value: 'swansong', context: 'Mot de passe Terminal (page Blue prince)' },
  { value: '45292', context: 'Hovel : 2 starting rooms' },
  { value: 'SWNSNG', context: 'Immatriculation voiture (Garage)' },
]

// --- LIENS (mentions explicites dans Notion) ---
// [type, nom] -> [type, nom], label
const links = [
  [['person', "Maid's chamber"], ['room', 'Chapel'], 'réf.'],
  [['person', 'Mary Matthew Jones'], ['person', 'Marion Marigold'], 'nom de scène'],
  [['person', 'Courntney'], ['person', 'Mary Matthew Jones'], 'complot disparition'],
  [['person', 'Courntney'], ['person', 'The Children of black water'], 'lié à'],
  [['person', 'Mr Revane (hovel)'], ['person', 'Anne Babage'], 'viré par'],
  [['person', 'Christophe'], ['person', 'Anne Babage'], 'employé de'],
  [['room', 'Garage'], ['room', 'Dining Room'], 'demande la clé'],
]

const ROOM_FIELDS = ['name', 'type', 'position', 'tableau_combo', 'chess_pieces', 'objects', 'letters', 'days_seen', 'notes']

const insertRoom = db.prepare(
  `INSERT INTO rooms (${ROOM_FIELDS.join(',')}) VALUES (${ROOM_FIELDS.map(() => '?').join(',')})`
)
const roomExists = db.prepare('SELECT id FROM rooms WHERE name = ?')
const insertPerson = db.prepare('INSERT INTO people (name, notes) VALUES (?, ?)')
const personExists = db.prepare('SELECT id FROM people WHERE name = ?')
const insertCode = db.prepare('INSERT INTO codes (value, context) VALUES (?, ?)')
const codeExists = db.prepare('SELECT id FROM codes WHERE value = ?')
const insertLink = db.prepare('INSERT INTO links (from_type, from_id, to_type, to_id, label) VALUES (?, ?, ?, ?, ?)')

let nRooms = 0, nPeople = 0, nCodes = 0, nLinks = 0

const tx = db.transaction(() => {
  for (const r of rooms) {
    if (roomExists.get(r.name)) continue
    insertRoom.run(
      r.name, r.type || 'Other', r.position || null, r.tableau_combo || null,
      r.chess_pieces || null, r.objects || null, r.letters || null, r.days_seen || null, r.notes || null
    )
    nRooms++
  }
  for (const p of people) {
    if (personExists.get(p.name)) continue
    insertPerson.run(p.name, p.notes || null)
    nPeople++
  }
  for (const c of codes) {
    if (codeExists.get(c.value)) continue
    insertCode.run(c.value, c.context || null)
    nCodes++
  }
  // liens : résolution nom -> id
  const idOf = (type, name) => {
    const row = type === 'room' ? roomExists.get(name) : personExists.get(name)
    return row ? row.id : null
  }
  for (const [[ft, fn], [tt, tn], label] of links) {
    const fromId = idOf(ft, fn)
    const toId = idOf(tt, tn)
    if (!fromId || !toId) continue
    insertLink.run(ft, fromId, tt, toId, label)
    nLinks++
  }
})
tx()

console.log(`Import terminé : ${nRooms} pièces, ${nPeople} personnes, ${nCodes} codes, ${nLinks} liens.`)
