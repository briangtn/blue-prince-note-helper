import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { meta, ENTITY_TYPES } from '../api/entities.js'

// Panneau de liens réutilisable pour n'importe quelle entité.
// Props: type (string), id (number|string), compact (bool)
export default function LinksPanel({ type, id, title = 'Liens' }) {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [links, setLinks] = useState([])
  const [entities, setEntities] = useState([])
  const [adding, setAdding] = useState(false)
  const [mode, setMode] = useState('existing') // existing | new
  const [target, setTarget] = useState('')
  const [label, setLabel] = useState('')
  const [newType, setNewType] = useState('person')
  const [newLabel, setNewLabel] = useState('')

  const load = useCallback(() => {
    if (id == null) return
    api.linksFor(type, id).then(setLinks)
  }, [type, id])

  useEffect(() => { load() }, [load])
  useEffect(() => { if (adding) api.listEntities().then(setEntities) }, [adding])
  useWs(load, ['links'])

  const add = async (e) => {
    e.preventDefault()
    let to_type, to_id
    if (mode === 'new') {
      if (!newLabel.trim()) return
      const created = await api.createEntity(newType, newLabel.trim())
      to_type = created.type; to_id = created.id
    } else {
      if (!target) return
      const [t, i] = target.split('::')
      to_type = t; to_id = Number(i)
    }
    await api.createLink({ from_type: type, from_id: id, to_type, to_id, label })
    setTarget(''); setLabel(''); setNewLabel(''); setAdding(false); setMode('existing')
    load()
  }

  const remove = async (linkId) => { await api.deleteLink(linkId); load() }

  // exclut l'entité elle-même de la liste de cibles
  const options = entities.filter((e) => !(e.type === type && String(e.id) === String(id)))

  return (
    <div className="bg-slate-900/60 rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-sm">🔗 {title}</h4>
        {canEdit && (
          <button onClick={() => setAdding((v) => !v)} className="text-cyan-400 hover:text-cyan-300 text-sm">
            {adding ? '×' : '+ lien'}
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={add} className="space-y-2 mb-3">
          <div className="flex gap-1 text-xs">
            <button type="button" onClick={() => setMode('existing')}
              className={`px-2 py-1 rounded ${mode === 'existing' ? 'bg-cyan-600' : 'bg-slate-700'}`}>Existant</button>
            <button type="button" onClick={() => setMode('new')}
              className={`px-2 py-1 rounded ${mode === 'new' ? 'bg-cyan-600' : 'bg-slate-700'}`}>Nouveau</button>
          </div>
          {mode === 'existing' ? (
            <select value={target} onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm">
              <option value="">— relier à —</option>
              {options.map((e) => (
                <option key={`${e.type}::${e.id}`} value={`${e.type}::${e.id}`}>
                  {meta(e.type).icon} {e.label}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex gap-2">
              <select value={newType} onChange={(e) => setNewType(e.target.value)}
                className="bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm">
                {ENTITY_TYPES.map((t) => <option key={t} value={t}>{meta(t).icon} {meta(t).label}</option>)}
              </select>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)}
                placeholder={newType === 'day' ? 'n° du jour' : 'nom / valeur'}
                className="flex-1 min-w-0 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm" />
            </div>
          )}
          <div className="flex gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="label du lien (optionnel)"
              className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm" />
            <button className="bg-cyan-600 hover:bg-cyan-500 px-3 rounded text-sm">OK</button>
          </div>
        </form>
      )}

      <ul className="space-y-1">
        {links.map((l) => (
          <li key={l.id} className="flex items-center gap-2 text-sm bg-slate-800/60 rounded px-2 py-1">
            <span>{meta(l.other_type).icon}</span>
            <span className="flex-1 truncate">{l.other_label}</span>
            {l.label && <span className="text-xs text-slate-400 italic">{l.label}</span>}
            {canEdit && <button onClick={() => remove(l.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>}
          </li>
        ))}
        {links.length === 0 && !adding && <li className="text-xs text-slate-500">Aucun lien.</li>}
      </ul>
    </div>
  )
}
