// Days 01 = 7 nov 1993 (premier vrai jour). Days N = 7 nov 1993 + (N - 1) jours.
const START = new Date(Date.UTC(1993, 10, 7)) // mois 0-indexé : 10 = novembre

export function dayToDate(dayNumber) {
  const n = parseInt(dayNumber, 10)
  if (!n || n < 1) return null
  const d = new Date(START)
  d.setUTCDate(d.getUTCDate() + (n - 1))
  return d
}

// Mapping inverse : date réelle -> numéro de jour de jeu (null si avant le 7 nov 1993).
export function dateToDay(date) {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : date
  if (!d || isNaN(d.getTime())) return null
  const diff = Math.round((Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - START.getTime()) / 86400000)
  return diff >= 0 ? diff + 1 : null
}

export function formatGameDate(dayNumber) {
  const d = dayToDate(dayNumber)
  if (!d) return ''
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d)
}
