// Métadonnées des types d'entités liables
export const ENTITY_META = {
  room: { label: 'Pièce', icon: '🗺', color: '#3b82f6' },
  day: { label: 'Jour', icon: '📆', color: '#f59e0b' },
  person: { label: 'Personne', icon: '👤', color: '#ec4899' },
  code: { label: 'Code', icon: '🔑', color: '#10b981' },
  note: { label: 'Note', icon: '🗒', color: '#a855f7' },
  entity: { label: 'Entité', icon: '🧩', color: '#6366f1' },
  event: { label: 'Événement', icon: '📅', color: '#ef4444' },
  photo: { label: 'Photo', icon: '📷', color: '#0ea5e9', creatable: false },
}

export const ENTITY_TYPES = Object.keys(ENTITY_META)
// Types qu'on peut créer à la volée depuis le panneau de liens (une photo
// nécessite un fichier : on l'attache via la photothèque, pas en saisissant un nom).
export const CREATABLE_TYPES = ENTITY_TYPES.filter((t) => ENTITY_META[t].creatable !== false)
export const meta = (type) => ENTITY_META[type] || { label: type, icon: '•', color: '#64748b' }
