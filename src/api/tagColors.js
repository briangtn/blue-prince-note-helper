// Couleurs des tags, façon "labels GitHub". Module isomorphe (importé par le
// client ET par le serveur) : il doit rester sans dépendance.

// Palette inspirée des couleurs de labels par défaut de GitHub.
export const TAG_PALETTE = [
  '#d73a4a', '#0075ca', '#a2eeef', '#7057ff', '#008672',
  '#e4e669', '#d876e3', '#0e8a16', '#fbca04', '#b60205',
  '#006b75', '#5319e7', '#f9856b', '#bfdadc', '#c5def5',
  '#1d76db', '#fef2c0', '#84b6eb',
]

// Couleur stable déduite du nom (même résultat côté client et serveur).
// FNV-1a + mélange final pour une répartition correcte sur la palette.
export function colorForName(name = '') {
  let h = 2166136261
  for (let i = 0; i < name.length; i++) {
    h ^= name.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  h ^= h >>> 15
  h = (h >>> 0)
  return TAG_PALETTE[h % TAG_PALETTE.length]
}

// Texte noir ou blanc selon la luminance du fond (lisibilité, comme GitHub).
export function tagTextColor(hex = '#cccccc') {
  const c = hex.replace('#', '')
  if (c.length < 6) return '#1f2328'
  const r = parseInt(c.slice(0, 2), 16)
  const g = parseInt(c.slice(2, 4), 16)
  const b = parseInt(c.slice(4, 6), 16)
  const yiq = (r * 299 + g * 587 + b * 114) / 1000
  return yiq >= 150 ? '#1f2328' : '#ffffff'
}
