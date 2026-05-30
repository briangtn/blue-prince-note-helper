import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import LoginForm from './components/LoginForm.jsx'
import RoomsView from './components/RoomsView.jsx'
import DateCalc from './components/DateCalc.jsx'
import Whiteboard from './components/Whiteboard.jsx'
import CodesView from './components/CodesView.jsx'
import DayView from './components/DayView.jsx'
import PeopleView from './components/PeopleView.jsx'
import NotesView from './components/NotesView.jsx'
import Genealogy from './components/Genealogy.jsx'
import RelationsGraph from './components/RelationsGraph.jsx'

const TABS = [
  ['day', '📆 Jour'],
  ['rooms', '🗺 Rooms'],
  ['people', '👥 Personnes'],
  ['genealogy', '🌳 Généalogie'],
  ['relations', '🕸 Relations'],
  ['notes', '🗒 Notes'],
  ['date', '📅 Calendrier'],
  ['board', '🔗 Whiteboard'],
  ['codes', '🔑 Codes'],
]

function AppContent() {
  const [tab, setTab] = useState('day')
  const { user, role, logout } = useAuth()

  return (
    <div className="flex flex-col h-full">
      <header className="flex flex-wrap items-center gap-1 px-4 py-2 bg-slate-900 border-b border-slate-700 shrink-0">
        <span className="font-bold text-cyan-400 mr-4">Blue Prince Helper</span>
        {TABS.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`px-4 py-2 rounded ${tab === key ? 'bg-slate-700' : 'hover:bg-slate-800'}`}>
            {label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2 text-sm text-slate-400">
          <span>{user} ({role === 'ro' ? 'lecture seule' : 'lecture/écriture'})</span>
          <button onClick={logout} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300">
            Déconnexion
          </button>
        </div>
      </header>
      <div className="flex-1 overflow-hidden">
        {tab === 'day' && <DayView />}
        {tab === 'rooms' && <RoomsView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'genealogy' && <Genealogy />}
        {tab === 'relations' && <RelationsGraph />}
        {tab === 'notes' && <NotesView />}
        {tab === 'date' && <DateCalc />}
        {tab === 'board' && <Whiteboard />}
        {tab === 'codes' && <CodesView />}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <LoginForm />
  return <AppContent />
}
