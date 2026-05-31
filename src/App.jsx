import { useState } from 'react'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { ThemeProvider, useTheme } from './ui/ThemeContext.jsx'
import { Icons } from './ui/Icons.jsx'
import LoginForm from './components/LoginForm.jsx'
import DayView from './components/DayView.jsx'
import RoomsView from './components/RoomsView.jsx'
import PeopleView from './components/PeopleView.jsx'
import CodesView from './components/CodesView.jsx'
import NotesView from './components/NotesView.jsx'
import EntitiesView from './components/EntitiesView.jsx'
import Whiteboard from './components/Whiteboard.jsx'
import RelationsGraph from './components/RelationsGraph.jsx'
import Genealogy from './components/Genealogy.jsx'
import DateCalc from './components/DateCalc.jsx'
import CalendarView from './components/CalendarView.jsx'

const NAV_ITEMS = [
  { id: 'day',    label: 'Jour',       icon: 'grid' },
  { id: 'rooms',  label: 'Pièces',     icon: 'door' },
  { id: 'people', label: 'Personnes',  icon: 'people' },
  { id: 'codes',  label: 'Codes',      icon: 'key' },
  { id: 'notes',  label: 'Notes',      icon: 'note' },
  { id: 'entities', label: 'Entités',  icon: 'grid' },
]

const EXTRA_ITEMS = [
  { id: 'calendar',  label: 'Calendrier', icon: 'calendar' },
  { id: 'relations', label: 'Relations', icon: 'people' },
  { id: 'genealogy', label: 'Généalogie', icon: 'crown' },
  { id: 'board',     label: 'Whiteboard', icon: 'edit' },
  { id: 'date',      label: 'Calcul date', icon: 'calendar' },
]

function Sidebar({ tab, setTab }) {
  const { user, role, logout } = useAuth()
  const { theme, setTheme, navStyle, setNavStyle } = useTheme()
  const [showSettings, setShowSettings] = useState(false)
  const [showMore, setShowMore] = useState(false)

  return (
    <nav style={{
      width: 180, background: 'var(--bp-surface)',
      borderRight: '1px solid var(--bp-border)',
      display: 'flex', flexDirection: 'column',
      padding: '12px 0', gap: 2, flexShrink: 0, overflow: 'hidden',
    }}>
      <div style={{
        padding: '8px 16px 16px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'var(--bp-accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icons.crown style={{ width: 18, height: 18, color: '#fff' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700,
          color: 'var(--bp-text)', whiteSpace: 'nowrap',
        }}>Blue Prince</span>
      </div>

      {NAV_ITEMS.map(item => {
        const active = tab === item.id
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
            background: active ? 'var(--bp-panel)' : 'transparent',
            border: 'none', cursor: 'pointer',
            borderRight: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
            color: active ? 'var(--bp-text)' : 'var(--bp-text-dim)',
            fontSize: 13, fontWeight: active ? 600 : 400,
            fontFamily: 'var(--font-body)', transition: 'all .15s',
          }}>
            <IconComp style={{ width: 18, height: 18, flexShrink: 0 }} />
            <span>{item.label}</span>
          </button>
        )
      })}

      <div style={{ padding: '8px 16px 0' }}>
        <button onClick={() => setShowMore(!showMore)} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--bp-text-muted)', fontSize: 10, fontWeight: 600,
          textTransform: 'uppercase', letterSpacing: '.05em',
          padding: '4px 0', display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <Icons.chevR style={{
            width: 10, height: 10,
            transform: showMore ? 'rotate(90deg)' : 'none',
            transition: 'transform .15s',
          }} />
          Plus
        </button>
      </div>

      {showMore && EXTRA_ITEMS.map(item => {
        const active = tab === item.id
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px',
            background: active ? 'var(--bp-panel)' : 'transparent',
            border: 'none', cursor: 'pointer',
            borderRight: active ? '2px solid var(--bp-accent)' : '2px solid transparent',
            color: active ? 'var(--bp-text)' : 'var(--bp-text-muted)',
            fontSize: 12, fontWeight: active ? 600 : 400,
            fontFamily: 'var(--font-body)', transition: 'all .15s',
          }}>
            <IconComp style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>{item.label}</span>
          </button>
        )
      })}

      <div style={{ flex: 1 }} />

      <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        <button onClick={() => setShowSettings(!showSettings)} style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 4px',
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--bp-text-muted)', fontSize: 11, fontFamily: 'var(--font-body)',
        }}>
          <Icons.settings style={{ width: 14, height: 14 }} />
          Apparence
        </button>

        {showSettings && (
          <div style={{
            padding: 10, borderRadius: 6, background: 'var(--bp-bg)',
            border: '1px solid var(--bp-border)', display: 'flex', flexDirection: 'column', gap: 8,
          }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Thème</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {['blueprint', 'manoir', 'moderne'].map(t => (
                  <button key={t} onClick={() => setTheme(t)} style={{
                    flex: 1, padding: '4px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontFamily: 'var(--font-body)', textTransform: 'capitalize',
                    background: theme === t ? 'var(--bp-accent)' : 'var(--bp-panel)',
                    color: theme === t ? '#fff' : 'var(--bp-text-dim)',
                  }}>{t}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, color: 'var(--bp-text-muted)', marginBottom: 4 }}>Navigation</div>
              <div style={{ display: 'flex', gap: 3 }}>
                {['sidebar', 'top bar'].map(n => (
                  <button key={n} onClick={() => setNavStyle(n)} style={{
                    flex: 1, padding: '4px 0', borderRadius: 4, border: 'none', cursor: 'pointer',
                    fontSize: 10, fontFamily: 'var(--font-body)', textTransform: 'capitalize',
                    background: navStyle === n ? 'var(--bp-accent)' : 'var(--bp-panel)',
                    color: navStyle === n ? '#fff' : 'var(--bp-text-dim)',
                  }}>{n}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div style={{
          padding: '8px 4px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderTop: '1px solid var(--bp-border)',
        }}>
          <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>
            {user} <span style={{ fontSize: 9, opacity: .6 }}>({role === 'ro' ? 'RO' : 'RW'})</span>
          </span>
          <button onClick={logout} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)',
            padding: 2,
          }}>
            <Icons.logout style={{ width: 14, height: 14 }} />
          </button>
        </div>
      </div>
    </nav>
  )
}

function TopBar({ tab, setTab }) {
  const { user, role, logout } = useAuth()
  const { theme, setTheme } = useTheme()

  return (
    <header style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '0 20px', height: 52,
      background: 'var(--bp-surface)',
      borderBottom: '1px solid var(--bp-border)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 6,
          background: 'var(--bp-accent)', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Icons.crown style={{ width: 15, height: 15, color: '#fff' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 15, fontWeight: 700, color: 'var(--bp-text)',
        }}>Blue Prince</span>
      </div>
      {[...NAV_ITEMS, ...EXTRA_ITEMS].map(item => {
        const active = tab === item.id
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => setTab(item.id)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', borderRadius: 6,
            background: active ? 'var(--bp-panel)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: active ? 'var(--bp-text)' : 'var(--bp-text-dim)',
            fontSize: 13, fontWeight: active ? 600 : 400,
            fontFamily: 'var(--font-body)', transition: 'all .15s',
          }}>
            <IconComp style={{ width: 16, height: 16 }} />
            <span>{item.label}</span>
          </button>
        )
      })}
      <div style={{ flex: 1 }} />
      <div style={{ display: 'flex', gap: 3, marginRight: 12 }}>
        {['blueprint', 'manoir', 'moderne'].map(t => (
          <button key={t} onClick={() => setTheme(t)} style={{
            padding: '3px 8px', borderRadius: 4, border: 'none', cursor: 'pointer',
            fontSize: 10, fontFamily: 'var(--font-body)', textTransform: 'capitalize',
            background: theme === t ? 'var(--bp-accent)' : 'var(--bp-panel)',
            color: theme === t ? '#fff' : 'var(--bp-text-dim)',
          }}>{t}</button>
        ))}
      </div>
      <span style={{ fontSize: 11, color: 'var(--bp-text-muted)', marginRight: 8 }}>
        {user} ({role === 'ro' ? 'RO' : 'RW'})
      </span>
      <button onClick={logout} style={{
        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)', padding: 4,
      }}>
        <Icons.logout style={{ width: 16, height: 16 }} />
      </button>
    </header>
  )
}

function AppContent() {
  const [tab, setTab] = useState('day')
  const { navStyle } = useTheme()
  const isSidebar = navStyle === 'sidebar'

  return (
    <div style={{
      display: 'flex', flexDirection: isSidebar ? 'row' : 'column',
      height: '100vh', width: '100vw', overflow: 'hidden',
      background: 'var(--bp-bg)',
    }}>
      {isSidebar ? (
        <Sidebar tab={tab} setTab={setTab} />
      ) : (
        <TopBar tab={tab} setTab={setTab} />
      )}
      <main style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'day' && <DayView />}
        {tab === 'rooms' && <RoomsView />}
        {tab === 'people' && <PeopleView />}
        {tab === 'codes' && <CodesView />}
        {tab === 'notes' && <NotesView />}
        {tab === 'entities' && <EntitiesView />}
        {tab === 'calendar' && <CalendarView />}
        {tab === 'relations' && <RelationsGraph />}
        {tab === 'genealogy' && <Genealogy />}
        {tab === 'board' && <Whiteboard />}
        {tab === 'date' && <DateCalc />}
      </main>
    </div>
  )
}

function AppInner() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (!user) return <LoginForm />
  return <AppContent />
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </AuthProvider>
  )
}
