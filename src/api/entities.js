// Métadonnées des types d'entités liables
export const ENTITY_META = {
  room: { label: 'Pièce', icon: '🗺', color: '#3b82f6' },
  day: { label: 'Jour', icon: '📆', color: '#f59e0b' },
  person: { label: 'Personne', icon: '👤', color: '#ec4899' },
  code: { label: 'Code', icon: '🔑', color: '#10b981' },
  note: { label: 'Note', icon: '🗒', color: '#a855f7' },
  entity: { label: 'Entité', icon: '🧩', color: '#6366f1' },
  event: { label: 'Événement', icon: '📅', color: '#ef4444' },
}

export const ENTITY_TYPES = Object.keys(ENTITY_META)
export const meta = (type) => ENTITY_META[type] || { label: type, icon: '•', color: '#64748b' }
