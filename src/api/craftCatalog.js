// Catalogue des crafts Blue Prince (recettes de l'Atelier / Workshop).
// Source : https://blue-prince.fandom.com/wiki/Workshop (catégorie « Contraptions »).
//
// ⚠️ ANTI-SPOIL : ce catalogue n'est JAMAIS affiché en entier dans l'UI.
// On ne révèle une recette que lorsqu'elle est :
//   - réalisable (tous les ingrédients sont des items découverts), ou
//   - à un seul item près (tous sauf un sont découverts).
// Les ingrédients (et le résultat) référencent des noms d'items du catalogue d'items.
//
// result   = item produit
// inputs    = [{ name, qty }] ingrédients consommés
// effect    = description (affichée seulement une fois la recette révélée)
export const CRAFT_CATALOG = [
  {
    result: 'Electromagnet',
    inputs: [{ name: 'Compass', qty: 1 }, { name: 'Battery Pack', qty: 1 }],
    effect: 'Augmente la chance de tirer une pièce mécanique.',
  },
  {
    result: 'Lucky Purse',
    inputs: [{ name: 'Coin Purse', qty: 1 }, { name: "Lucky Rabbit's Foot", qty: 1 }],
    effect: "Double l'effet du Coin Purse.",
  },
  {
    result: 'Pick Sound Amplifier',
    inputs: [{ name: 'Lockpick', qty: 1 }, { name: 'Metal Detector', qty: 1 }],
    effect: 'Améliore les chances de crochetage des serrures sensibles.',
  },
  {
    result: 'Burning Glass',
    inputs: [{ name: 'Magnifying Glass', qty: 1 }, { name: 'Metal Detector', qty: 1 }],
    effect: 'Permet d\'allumer les objets inflammables (bougies, torches, mèches).',
  },
  {
    result: 'Detector Shovel',
    inputs: [{ name: 'Shovel', qty: 1 }, { name: 'Metal Detector', qty: 1 }],
    effect: 'Augmente la chance de déterrer des objets métalliques (clés, or).',
  },
  {
    result: 'Dowsing Rod',
    inputs: [{ name: 'Shovel', qty: 1 }, { name: 'Compass', qty: 1 }],
    effect: 'Indique au drafting les pièces susceptibles de contenir plus d\'objets.',
  },
  {
    result: 'Jack Hammer',
    inputs: [{ name: 'Shovel', qty: 1 }, { name: 'Battery Pack', qty: 1 }, { name: 'Broken Lever', qty: 1 }],
    effect: 'Pelle plus puissante : déterre des objets rares (gemmes, Wind-up Keys).',
  },
  {
    result: 'Power Hammer',
    inputs: [{ name: 'Sledgehammer', qty: 1 }, { name: 'Battery Pack', qty: 1 }, { name: 'Broken Lever', qty: 1 }],
    effect: 'Casse les murs de brique fragilisés et certaines portes condamnées.',
  },
]

// Index par nom de résultat.
export const CRAFT_BY_RESULT = Object.fromEntries(CRAFT_CATALOG.map((c) => [c.result, c]))

// Recherche une recette par nom de résultat (exact, insensible à la casse / espaces).
// Sert à découvrir un craft en tapant son nom — sans jamais lister le catalogue (anti-spoil).
export function lookupCraft(name) {
  if (!name) return null
  const key = name.trim().toLowerCase()
  return CRAFT_CATALOG.find((c) => c.result.toLowerCase() === key) || null
}
