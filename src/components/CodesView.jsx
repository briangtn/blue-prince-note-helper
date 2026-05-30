import { useState, useEffect } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import LinksPanel from './LinksPanel.jsx'

const STATUSES = {
  pending: { label: 'En attente', color: 'bg-amber-600' },
  tried: { label: 'Testé', color: 'bg-blue-600' },
  confirmed: { label: 'Confirmé', color: 'bg-green-600' },
  rejected: { label: 'Rejeté', color: 'bg-red-700' },
}
const ORDER = ['confirmed', 'pending', 'tried', 'rejected']

export default function CodesView() {
  const [codes, setCodes] = useState([])
  const [value, setValue] = useState('')
  const [context, setContext] = useState('')

  const load = () => api.listCodes().then(setCodes)
  useEffect(() => { load() }, [])
  useWs(load, ['codes'])

  const add = async (e) => {
    e.preventDefault()
    if (!value.trim()) return
    await api.createCode({ value: value.trim(), context })
    setValue(''); setContext('')
    load()
  }

  const cycle = async (c) => {
    const keys = Object.keys(STATUSES)
    const next = keys[(keys.indexOf(c.status) + 1) % keys.length]
    await api.updateCode(c.id, { ...c, status: next })
    load()
  }

  const remove = async (id) => { await api.deleteCode(id); load() }

  const sorted = [...codes].sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status))

  return (
    <div className="max-w-3xl mx-auto mt-8 p-6">
      <h2 className="text-2xl font-bold mb-6">🔑 Codes potentiels</h2>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input value={value} onChange={(e) => setValue(e.target.value)} placeholder="Code (ex: 1234)"
          className="w-40 bg-slate-800 border border-slate-600 rounded px-3 py-2" />
        <input value={context} onChange={(e) => setContext(e.target.value)} placeholder="Contexte / où"
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2" />
        <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">Ajouter</button>
      </form>
      <div className="space-y-2">
        {sorted.map((c) => (
          <div key={c.id} className="bg-slate-800 rounded-lg px-4 py-3 space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-lg font-bold">{c.value}</span>
              <span className="flex-1 text-slate-400 text-sm">{c.context}</span>
              <button onClick={() => cycle(c)} className={`${STATUSES[c.status].color} px-3 py-1 rounded text-sm`}>
                {STATUSES[c.status].label}
              </button>
              <button onClick={() => remove(c.id)} className="text-red-400 hover:text-red-300 text-sm">✕</button>
            </div>
            <LinksPanel type="code" id={c.id} />
          </div>
        ))}
        {codes.length === 0 && <p className="text-slate-500">Aucun code noté.</p>}
      </div>
    </div>
  )
}
