// Traducteur de la langue du jeu, 100 % piloté par les données saisies dans le
// dictionnaire (mots connus + préfixes + suffixes). Aucune connaissance du jeu
// n'est codée en dur ici : tant qu'un morphème n'a pas été ajouté à la main, il
// reste « inconnu ». => pas de spoil possible.
//
// Mécanique modélisée (telle que décrite) : un mot se compose, à la manière de
// l'allemand, d'un préfixe optionnel en tête, d'un ou plusieurs mots connus, et
// d'un suffixe optionnel en fin. On cherche le découpage qui couvre le plus de
// lettres avec des morphèmes connus (et, à couverture égale, avec les plus longs).

function norm(s) {
  return (s || '').toLowerCase()
}

// Construit la liste des morphèmes utilisables à partir des entrées du dictionnaire.
export function buildMorphemes(entries) {
  return (entries || [])
    .filter((e) => e && e.term && e.term.trim())
    .map((e) => ({
      term: e.term.trim(),
      definition: (e.definition || '').trim(),
      kind: e.kind === 'prefix' || e.kind === 'suffix' ? e.kind : 'word',
    }))
}

// Choisit la meilleure solution : d'abord le moins de lettres inconnues,
// puis le moins de segments (= des correspondances plus longues / « gloutonnes »).
function better(a, b) {
  if (!a) return b
  if (!b) return a
  if (a.unknown !== b.unknown) return a.unknown < b.unknown ? a : b
  if (a.count !== b.count) return a.count < b.count ? a : b
  return a
}

// Découpe un seul token (sans espace) en segments connus/inconnus.
function segmentToken(token, morphemes) {
  const lw = norm(token)
  const n = lw.length
  if (n === 0) return { segments: [], unknown: 0 }

  const memo = new Map()

  function solve(i) {
    if (i >= n) return { segs: [], unknown: 0, count: 0 }
    if (memo.has(i)) return memo.get(i)

    let best = null
    for (const m of morphemes) {
      const t = norm(m.term)
      const len = t.length
      if (!len || !lw.startsWith(t, i)) continue
      const end = i + len
      // contraintes de position : préfixe seulement en tête, suffixe seulement en fin
      if (m.kind === 'prefix' && i !== 0) continue
      if (m.kind === 'suffix' && end !== n) continue
      const rest = solve(end)
      best = better(best, {
        segs: [{ start: i, end, m }, ...rest.segs],
        unknown: rest.unknown,
        count: rest.count + 1,
      })
    }
    // sinon : la lettre courante reste inconnue
    const rest = solve(i + 1)
    best = better(best, {
      segs: [{ start: i, end: i + 1, m: null }, ...rest.segs],
      unknown: rest.unknown + 1,
      count: rest.count,
    })

    memo.set(i, best)
    return best
  }

  const res = solve(0)

  // fusionne les lettres inconnues consécutives en un seul segment
  const segments = []
  for (const s of res.segs) {
    if (s.m) {
      segments.push({
        text: token.slice(s.start, s.end),
        known: true,
        kind: s.m.kind,
        term: s.m.term,
        definition: s.m.definition,
      })
    } else {
      const last = segments[segments.length - 1]
      if (last && !last.known) last.text += token.slice(s.start, s.end)
      else segments.push({ text: token.slice(s.start, s.end), known: false })
    }
  }

  return { segments, unknown: res.unknown }
}

// Traduit une phrase entière. Retourne une liste de « morceaux » :
//  - { space: true, text }                              → séparateur conservé tel quel
//  - { text, segments, unknown, translation, ... }      → un token traduit
export function translatePhrase(input, entries) {
  const morphemes = buildMorphemes(entries)
  const parts = (input || '').split(/(\s+)/) // conserve les espaces comme tokens

  return parts
    .filter((p) => p.length > 0)
    .map((p) => {
      if (/^\s+$/.test(p)) return { space: true, text: p }
      const { segments, unknown } = segmentToken(p, morphemes)
      const translation = segments
        .map((s) => (s.known ? s.definition || `[${s.term}]` : s.text))
        .join('')
      return {
        text: p,
        segments,
        unknown,
        translation,
        recognized: segments.some((s) => s.known),
        complete: unknown === 0 && segments.some((s) => s.known),
      }
    })
}
