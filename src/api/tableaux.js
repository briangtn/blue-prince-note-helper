// Helpers pour les combinaisons de tableaux.
// Les tableaux ne sont PAS liés aux pièces mais aux POSITIONS de la grille (row, col) :
// une combinaison de 2 mots/tableaux dont la différence d'une lettre donne la lettre
// trouvée pour cette position. Ex : "Stage" / "Sage" → "T".

// Renvoie un tableau de paires [[a, b], …]. Garantit au moins une paire vide pour l'édition.
export function parseCombos(json) {
  try {
    const a = typeof json === 'string' ? JSON.parse(json || '[]') : (json || [])
    const pairs = a.map((p) => [p?.[0] || '', p?.[1] || ''])
    return pairs.length ? pairs : [['', '']]
  } catch {
    return [['', '']]
  }
}

// Lettre de différence entre deux mots.
// - Si un mot = l'autre + 1 lettre insérée  → cette lettre (cas principal, ex Stage/Sage → T).
// - Sinon, différence d'ensemble (lettres du plus long absentes du plus court).
// Renvoie '' si indéterminable.
export function tableauLetter(a, b) {
  const x = (a || '').toUpperCase().replace(/[^A-Z]/g, '')
  const y = (b || '').toUpperCase().replace(/[^A-Z]/g, '')
  if (!x || !y) return ''
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]

  // Cas insertion simple : une seule lettre en plus.
  if (long.length - short.length === 1) {
    let i = 0
    while (i < short.length && short[i] === long[i]) i++
    return long[i] || ''
  }

  // Repli : différence de multi-ensemble.
  const counts = {}
  for (const ch of short) counts[ch] = (counts[ch] || 0) + 1
  let extra = ''
  for (const ch of long) {
    if (counts[ch]) counts[ch]--
    else extra += ch
  }
  return extra
}

// Pour une liste de combos, renvoie la liste des lettres trouvées (non vides).
export function comboLetters(combos) {
  return parseCombos(combos)
    .map((p) => tableauLetter(p[0], p[1]))
    .filter(Boolean)
}
