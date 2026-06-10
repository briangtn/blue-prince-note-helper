// Logique de suggestion de crafts — pure, sans dépendance React.
// Croise le catalogue de recettes avec l'inventaire d'items découverts.
//
// ANTI-SPOIL : on ne révèle qu'une recette « réalisable » (tous les ingrédients
// possédés) ou « à un item près » (un seul ingrédient manquant). Les recettes
// dont 2+ ingrédients manquent restent masquées.
import { CRAFT_CATALOG } from './craftCatalog.js'

const norm = (s) => (s || '').trim().toLowerCase()

// inventory : [{ name, quantity }] -> Map nom normalisé -> quantité totale
export function buildInventory(items) {
  const map = new Map()
  for (const it of items || []) {
    const k = norm(it.name)
    if (!k) continue
    map.set(k, (map.get(k) || 0) + (Number(it.quantity) || 0))
  }
  return map
}

// Évalue une recette contre l'inventaire.
// -> { ...craft, ingredients:[{name,qty,have,ok}], missing:[...], status }
// status ∈ 'craftable' | 'missing-one' | 'locked'
export function evaluateCraft(craft, inv) {
  const ingredients = craft.inputs.map((ing) => {
    const have = inv.get(norm(ing.name)) || 0
    return { name: ing.name, qty: ing.qty, have, ok: have >= ing.qty }
  })
  const missing = ingredients.filter((i) => !i.ok)
  let status = 'locked'
  if (missing.length === 0) status = 'craftable'
  else if (missing.length === 1) status = 'missing-one'
  return { ...craft, ingredients, missing, status }
}

// Renvoie { craftable:[], missingOne:[] }.
// `items`     = inventaire (table items ou run_items).
// `discovered`= liste de noms de crafts DÉJÀ découverts. On ne suggère JAMAIS une
//   recette non découverte (anti-spoil fort). Si null, tout le catalogue est évalué.
// De plus, les recettes verrouillées (2+ items manquants) restent exclues.
export function suggestCrafts(items, discovered = null, catalog = CRAFT_CATALOG) {
  const inv = buildInventory(items)
  const allowed = discovered ? new Set([...discovered].map(norm)) : null
  const pool = allowed ? catalog.filter((c) => allowed.has(norm(c.result))) : catalog
  const craftable = []
  const missingOne = []
  for (const craft of pool) {
    const ev = evaluateCraft(craft, inv)
    if (ev.status === 'craftable') craftable.push(ev)
    else if (ev.status === 'missing-one') missingOne.push(ev)
  }
  return { craftable, missingOne }
}
