import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import LinksPanel from './LinksPanel.jsx'

export default function NotesView() {
  const [notes, setNotes] = useState([])
  const [title, setTitle] = useState('')

  const load = useCallback(() => api.listNotes().then(setNotes), [])
  useEffect(() => { load() }, [load])

  const add = async (e) => {
    e.preventDefault()
    if (!title.trim()) return
    await api.createNote({ title: title.trim(), body: '' })
    setTitle('')
    load()
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-5">🗒 Notes</h2>
      <form onSubmit={add} className="flex gap-2 mb-6">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre de la note…"
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-3 py-2" />
        <button className="bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium">Ajouter</button>
      </form>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notes.map((n) => <NoteCard key={n.id} note={n} onChange={load} />)}
        {notes.length === 0 && <p className="text-slate-500">Aucune note.</p>}
      </div>
    </div>
  )
}

function NoteCard({ note, onChange }) {
  const [title, setTitle] = useState(note.title || '')
  const [body, setBody] = useState(note.body || '')

  const save = async () => {
    if (title === (note.title || '') && body === (note.body || '')) return
    await api.updateNote(note.id, { title, body })
    onChange()
  }
  const remove = async () => {
    if (!confirm('Supprimer cette note ?')) return
    await api.deleteNote(note.id)
    onChange()
  }

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <div className="flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} onBlur={save}
          className="flex-1 bg-transparent font-bold text-lg outline-none border-b border-transparent focus:border-slate-600" />
        <button onClick={remove} className="text-red-400 hover:text-red-300 text-sm">Suppr</button>
      </div>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} onBlur={save} rows={3}
        placeholder="Contenu…"
        className="w-full bg-slate-900 border border-slate-600 rounded px-2 py-1.5 text-sm" />
      <LinksPanel type="note" id={note.id} />
    </div>
  )
}
