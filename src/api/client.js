const base = '/api'

function authHeaders() {
  const user = localStorage.getItem('bp_user')
  const pass = localStorage.getItem('bp_pass')
  if (!user || !pass) return {}
  return { Authorization: 'Basic ' + btoa(user + ':' + pass) }
}

async function req(path, opts = {}) {
  const res = await fetch(base + path, {
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  if (res.status === 401) {
    localStorage.removeItem('bp_user')
    localStorage.removeItem('bp_pass')
    window.location.reload()
    throw new Error('Authentication required')
  }
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export const api = {
  // rooms
  listRooms: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()
    return req('/rooms' + (qs ? `?${qs}` : ''))
  },
  createRoom: (body) => req('/rooms', { method: 'POST', body }),
  updateRoom: (id, body) => req(`/rooms/${id}`, { method: 'PUT', body }),
  deleteRoom: (id) => req(`/rooms/${id}`, { method: 'DELETE' }),
  // types
  listTypes: () => req('/rooms/types'),
  createType: (body) => req('/rooms/types', { method: 'POST', body }),
  deleteType: (id) => req(`/rooms/types/${id}`, { method: 'DELETE' }),
  // codes
  listCodes: () => req('/codes'),
  createCode: (body) => req('/codes', { method: 'POST', body }),
  updateCode: (id, body) => req(`/codes/${id}`, { method: 'PUT', body }),
  deleteCode: (id) => req(`/codes/${id}`, { method: 'DELETE' }),
  // whiteboard
  getBoard: () => req('/whiteboard'),
  saveBoard: (body) => req('/whiteboard', { method: 'PUT', body }),
  // days
  listDays: () => req('/days'),
  startDay: (day_number) => req('/days', { method: 'POST', body: { day_number } }),
  getDay: (n) => req(`/days/${n}`),
  updateDayNotes: (n, overall_notes) => req(`/days/${n}`, { method: 'PUT', body: { overall_notes } }),
  setSlept: (n, body) => req(`/days/${n}/slept`, { method: 'PUT', body }),
  setPlacement: (n, body) => req(`/days/${n}/placement`, { method: 'PUT', body }),
  removePlacement: (n, body) => req(`/days/${n}/placement`, { method: 'DELETE', body }),
  setSticky: (body) => req('/days/sticky', { method: 'PUT', body }),
  removeSticky: (body) => req('/days/sticky', { method: 'DELETE', body }),
  // tableaux par position (row, col)
  listTableaux: () => req('/tableaux'),
  setTableaux: (body) => req('/tableaux', { method: 'PUT', body }),
  // qualité du sol par position (row, col)
  listSoil: () => req('/soil'),
  setSoil: (body) => req('/soil', { method: 'PUT', body }),
  // people
  listPeople: () => req('/people'),
  createPerson: (body) => req('/people', { method: 'POST', body }),
  updatePerson: (id, body) => req(`/people/${id}`, { method: 'PUT', body }),
  setPersonPosition: (id, body) => req(`/people/${id}/position`, { method: 'PUT', body }),
  deletePerson: (id) => req(`/people/${id}`, { method: 'DELETE' }),
  // notes
  listNotes: () => req('/notes'),
  createNote: (body) => req('/notes', { method: 'POST', body }),
  updateNote: (id, body) => req(`/notes/${id}`, { method: 'PUT', body }),
  deleteNote: (id) => req(`/notes/${id}`, { method: 'DELETE' }),
  // todos (liste de tâches)
  listTodos: () => req('/todos'),
  createTodo: (body) => req('/todos', { method: 'POST', body }),
  updateTodo: (id, body) => req(`/todos/${id}`, { method: 'PUT', body }),
  deleteTodo: (id) => req(`/todos/${id}`, { method: 'DELETE' }),
  // dictionary (glossaire : terme + définition)
  listDictionary: () => req('/dictionary'),
  createDictionaryEntry: (body) => req('/dictionary', { method: 'POST', body }),
  updateDictionaryEntry: (id, body) => req(`/dictionary/${id}`, { method: 'PUT', body }),
  deleteDictionaryEntry: (id) => req(`/dictionary/${id}`, { method: 'DELETE' }),
  // entities (objets liables : titre + description)
  listEntityItems: () => req('/entities'),
  createEntityItem: (body) => req('/entities', { method: 'POST', body }),
  updateEntityItem: (id, body) => req(`/entities/${id}`, { method: 'PUT', body }),
  deleteEntityItem: (id) => req(`/entities/${id}`, { method: 'DELETE' }),
  // events (événements datés : date + titre + description)
  listEvents: () => req('/events'),
  createEvent: (body) => req('/events', { method: 'POST', body }),
  updateEvent: (id, body) => req(`/events/${id}`, { method: 'PUT', body }),
  deleteEvent: (id) => req(`/events/${id}`, { method: 'DELETE' }),
  // items (inventaire des items découverts)
  listItems: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString()
    return req('/items' + (qs ? `?${qs}` : ''))
  },
  createItem: (body) => req('/items', { method: 'POST', body }),
  updateItem: (id, body) => req(`/items/${id}`, { method: 'PUT', body }),
  deleteItem: (id) => req(`/items/${id}`, { method: 'DELETE' }),
  // run-items (items trouvés pendant une run, par jour)
  listRunItems: (day) => req(`/run-items${day != null ? `?day=${day}` : ''}`),
  addRunItem: (body) => req('/run-items', { method: 'POST', body }),
  updateRunItem: (id, body) => req(`/run-items/${id}`, { method: 'PUT', body }),
  deleteRunItem: (id) => req(`/run-items/${id}`, { method: 'DELETE' }),
  // crafts (recettes découvertes)
  listCrafts: () => req('/crafts'),
  createCraft: (body) => req('/crafts', { method: 'POST', body }),
  updateCraft: (id, body) => req(`/crafts/${id}`, { method: 'PUT', body }),
  deleteCraft: (id) => req(`/crafts/${id}`, { method: 'DELETE' }),
  // photos (photothèque)
  listPhotos: () => req('/photos'),
  photosFor: (type, id) => req(`/photos?entity_type=${type}&entity_id=${id}`),
  photoUsage: () => req('/photos/usage'),
  uploadPhoto: async (file, caption, tags) => {
    const form = new FormData()
    form.append('file', file)
    if (caption) form.append('caption', caption)
    if (tags && tags.length) form.append('tags', JSON.stringify(tags))
    const res = await fetch(base + '/photos', { method: 'POST', headers: authHeaders(), body: form })
    if (res.status === 401) {
      localStorage.removeItem('bp_user'); localStorage.removeItem('bp_pass')
      window.location.reload(); throw new Error('Authentication required')
    }
    if (!res.ok) throw new Error(await res.text())
    return res.json()
  },
  updatePhoto: (id, body) => req(`/photos/${id}`, { method: 'PUT', body }),
  deletePhoto: (id) => req(`/photos/${id}`, { method: 'DELETE' }),
  reorderPhotos: (ids) => req('/photos/order', { method: 'PUT', body: { ids } }),
  reorderEntityPhotos: (entity_type, entity_id, ids) =>
    req('/photos/entity-order', { method: 'PUT', body: { entity_type, entity_id, ids } }),
  // tags (catalogue façon labels GitHub : nom + couleur)
  listTags: () => req('/tags'),
  createTag: (body) => req('/tags', { method: 'POST', body }),
  updateTag: (id, body) => req(`/tags/${id}`, { method: 'PUT', body }),
  deleteTag: (id) => req(`/tags/${id}`, { method: 'DELETE' }),
  // links
  listEntities: () => req('/links/entities'),
  linksFor: (type, id) => req(`/links?type=${type}&id=${id}`),
  createLink: (body) => req('/links', { method: 'POST', body }),
  deleteLink: (id) => req(`/links/${id}`, { method: 'DELETE' }),
  graph: () => req('/links/graph'),
  // création générique d'une entité de n'importe quel type -> renvoie {type, id, label}
  createEntity: async (type, label) => {
    switch (type) {
      case 'room': { const r = await api.createRoom({ name: label, type: 'Blueprints' }); return { type, id: r.id, label: r.name } }
      case 'person': { const p = await api.createPerson({ name: label }); return { type, id: p.id, label: p.name } }
      case 'code': { const c = await api.createCode({ value: label }); return { type, id: c.id, label: c.value } }
      case 'note': { const n = await api.createNote({ title: label, body: '' }); return { type, id: n.id, label: n.title } }
      case 'entity': { const e = await api.createEntityItem({ title: label, description: '' }); return { type, id: e.id, label: e.title } }
      case 'event': { const ev = await api.createEvent({ title: label, description: '', date: null }); return { type, id: ev.id, label: ev.title } }
      case 'item': { const it = await api.createItem({ name: label, quantity: 1 }); return { type, id: it.id, label: it.name } }
      case 'craft': { const cr = await api.createCraft({ name: label, ingredients: [] }); return { type, id: cr.id, label: cr.name } }
      case 'day': { const d = await api.startDay(Number(label)); return { type, id: d.day_number, label: `Days ${d.day_number}` } }
      default: throw new Error('type inconnu: ' + type)
    }
  },
}
