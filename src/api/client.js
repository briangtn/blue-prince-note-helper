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
  setPlacement: (n, body) => req(`/days/${n}/placement`, { method: 'PUT', body }),
  removePlacement: (n, body) => req(`/days/${n}/placement`, { method: 'DELETE', body }),
  setSticky: (body) => req('/days/sticky', { method: 'PUT', body }),
  removeSticky: (body) => req('/days/sticky', { method: 'DELETE', body }),
  // tableaux par position (row, col)
  listTableaux: () => req('/tableaux'),
  setTableaux: (body) => req('/tableaux', { method: 'PUT', body }),
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
      case 'day': { const d = await api.startDay(Number(label)); return { type, id: d.day_number, label: `Days ${d.day_number}` } }
      default: throw new Error('type inconnu: ' + type)
    }
  },
}
