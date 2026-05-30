// Days 01 = 7 nov 1993 (premier vrai jour). Days N = 7 nov 1993 + (N - 1) jours.
const START = new Date(Date.UTC(1993, 10, 7)) // mois 0-indexé : 10 = novembre

export function dayToDate(dayNumber) {
  const n = parseInt(dayNumber, 10)
  if (!n || n < 1) return null
  const d = new Date(START)
  d.setUTCDate(d.getUTCDate() + (n - 1))
  return d
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
