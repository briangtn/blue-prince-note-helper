import { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './AuthContext.jsx'
import { ThemeProvider, useTheme } from './ui/ThemeContext.jsx'
import { useIsMobile } from './ui/useIsMobile.js'
import { Icons } from './ui/Icons.jsx'
import LoginForm from './components/LoginForm.jsx'
import DayView from './components/DayView.jsx'
import RoomsView from './components/RoomsView.jsx'
import PeopleView from './components/PeopleView.jsx'
import CodesView from './components/CodesView.jsx'
import ItemsView from './components/ItemsView.jsx'
import CraftsView from './components/CraftsView.jsx'
import NotesView from './components/NotesView.jsx'
import TodosView from './components/TodosView.jsx'
import DictionaryView from './components/DictionaryView.jsx'
import EntitiesView from './components/EntitiesView.jsx'
import PhotosView from './components/PhotosView.jsx'
import Whiteboard from './components/Whiteboard.jsx'
import RelationsGraph from './components/RelationsGraph.jsx'
import Genealogy from './components/Genealogy.jsx'
import DateCalc from './components/DateCalc.jsx'
import CalendarView from './components/CalendarView.jsx'
import LettersPlan from './components/LettersPlan.jsx'

const NAV_ITEMS = [
  { id: 'day',    path: '/day',    label: 'Jour',       icon: 'grid' },
  { id: 'rooms',  path: '/rooms',  label: 'Pièces',     icon: 'door' },
  { id: 'people', path: '/people', label: 'Personnes',  icon: 'people' },
  { id: 'codes',  path: '/codes',  label: 'Codes',      icon: 'key' },
  { id: 'items',  path: '/items',  label: 'Items',      icon: 'box' },
  { id: 'crafts', path: '/crafts', label: 'Crafts',     icon: 'craft' },
  { id: 'notes',  path: '/notes',  label: 'Notes',      icon: 'note' },
  { id: 'todos',  path: '/todos',  label: 'Tâches',     icon: 'check' },
  { id: 'dictionary', path: '/dictionary', label: 'Dictionnaire', icon: 'book' },
  { id: 'entities', path: '/entities', label: 'Entités',  icon: 'grid' },
  { id: 'photos', path: '/photos', label: 'Photothèque', icon: 'photo' },
]

const EXTRA_ITEMS = [
  { id: 'letters',   path: '/letters',   label: 'Plan lettres', icon: 'grid' },
  { id: 'calendar',  path: '/calendar',  label: 'Calendrier', icon: 'calendar' },
  { id: 'relations', path: '/relations', label: 'Relations', icon: 'people' },
  { id: 'genealogy', path: '/genealogy', label: 'Généalogie', icon: 'crown' },
  { id: 'board',     path: '/board',     label: 'Whiteboard', icon: 'edit' },
  { id: 'date',      path: '/date',      label: 'Calcul date', icon: 'calendar' },
]

function Sidebar() {
  const { user, role, logout } = useAuth()
  const { theme, setTheme, navStyle, setNavStyle } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
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
        const active = pathname === item.path
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => navigate(item.path)} style={{
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
        const active = pathname === item.path
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => navigate(item.path)} style={{
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

function TopBar() {
  const { user, role, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()

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
        const active = pathname === item.path
        const IconComp = Icons[item.icon]
        return (
          <button key={item.id} onClick={() => navigate(item.path)} style={{
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

function MobileNav() {
  const { user, role, logout } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)

  // Ferme le tiroir à chaque navigation et bloque le scroll du body quand ouvert.
  useEffect(() => { setOpen(false) }, [pathname])
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const go = (path) => { navigate(path); setOpen(false) }
  const active = (path) => pathname === path

  return (
    <>
      {/* Barre supérieure fixe */}
      <header style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 14px', height: 52, flexShrink: 0,
        background: 'var(--bp-surface)', borderBottom: '1px solid var(--bp-border)',
      }}>
        <button onClick={() => setOpen(true)} aria-label="Menu" style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 6,
          display: 'flex', alignItems: 'center', color: 'var(--bp-text)',
          marginLeft: -6,
        }}>
          <Icons.menu style={{ width: 22, height: 22 }} />
        </button>
        <div style={{
          width: 28, height: 28, borderRadius: 6, background: 'var(--bp-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icons.crown style={{ width: 15, height: 15, color: '#fff' }} />
        </div>
        <span style={{
          fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--bp-text)',
        }}>Blue Prince</span>
      </header>

      {/* Overlay + tiroir */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,.5)',
          }}
        >
          <nav
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: 0, left: 0, bottom: 0,
              width: 'min(82vw, 300px)',
              background: 'var(--bp-surface)', borderRight: '1px solid var(--bp-border)',
              display: 'flex', flexDirection: 'column',
              overflowY: 'auto', padding: '10px 0',
              boxShadow: '4px 0 24px rgba(0,0,0,.4)',
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '6px 16px 14px',
            }}>
              <span style={{
                fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 700, color: 'var(--bp-text)',
              }}>Menu</span>
              <button onClick={() => setOpen(false)} aria-label="Fermer" style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                color: 'var(--bp-text-muted)', display: 'flex',
              }}>
                <Icons.close style={{ width: 18, height: 18 }} />
              </button>
            </div>

            {[...NAV_ITEMS, ...EXTRA_ITEMS].map(item => {
              const IconComp = Icons[item.icon]
              const on = active(item.path)
              return (
                <button key={item.id} onClick={() => go(item.path)} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 18px',
                  background: on ? 'var(--bp-panel)' : 'transparent',
                  border: 'none', cursor: 'pointer',
                  borderLeft: on ? '3px solid var(--bp-accent)' : '3px solid transparent',
                  color: on ? 'var(--bp-text)' : 'var(--bp-text-dim)',
                  fontSize: 15, fontWeight: on ? 600 : 400, fontFamily: 'var(--font-body)',
                  textAlign: 'left',
                }}>
                  <IconComp style={{ width: 20, height: 20, flexShrink: 0 }} />
                  <span>{item.label}</span>
                </button>
              )
            })}

            <div style={{ flex: 1, minHeight: 16 }} />

            <div style={{ padding: '12px 16px 4px', borderTop: '1px solid var(--bp-border)' }}>
              <div style={{ fontSize: 11, color: 'var(--bp-text-muted)', marginBottom: 6 }}>Thème</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {['blueprint', 'manoir', 'moderne'].map(t => (
                  <button key={t} onClick={() => setTheme(t)} style={{
                    flex: 1, padding: '7px 0', borderRadius: 5, border: 'none', cursor: 'pointer',
                    fontSize: 11, fontFamily: 'var(--font-body)', textTransform: 'capitalize',
                    background: theme === t ? 'var(--bp-accent)' : 'var(--bp-panel)',
                    color: theme === t ? '#fff' : 'var(--bp-text-dim)',
                  }}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{
              padding: '12px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 13, color: 'var(--bp-text-muted)' }}>
                {user} <span style={{ fontSize: 10, opacity: .6 }}>({role === 'ro' ? 'RO' : 'RW'})</span>
              </span>
              <button onClick={logout} style={{
                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--bp-text-muted)',
                display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontFamily: 'var(--font-body)',
              }}>
                <Icons.logout style={{ width: 16, height: 16 }} />
                Déconnexion
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  )
}

function AppContent() {
  const { navStyle } = useTheme()
  const isMobile = useIsMobile()
  const isSidebar = navStyle === 'sidebar' && !isMobile

  return (
    <div style={{
      display: 'flex', flexDirection: isSidebar ? 'row' : 'column',
      height: '100vh', width: '100vw', overflow: 'hidden',
      background: 'var(--bp-bg)',
    }}>
      {isMobile ? <MobileNav /> : isSidebar ? <Sidebar /> : <TopBar />}
      <main style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Routes>
          <Route path="/" element={<Navigate to="/day" replace />} />
          <Route path="/day" element={<DayView />} />
          <Route path="/rooms" element={<RoomsView />} />
          <Route path="/people" element={<PeopleView />} />
          <Route path="/codes" element={<CodesView />} />
          <Route path="/items" element={<ItemsView />} />
          <Route path="/crafts" element={<CraftsView />} />
          <Route path="/notes" element={<NotesView />} />
          <Route path="/todos" element={<TodosView />} />
          <Route path="/dictionary" element={<DictionaryView />} />
          <Route path="/entities" element={<EntitiesView />} />
          <Route path="/photos" element={<PhotosView />} />
          <Route path="/letters" element={<LettersPlan />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/relations" element={<RelationsGraph />} />
          <Route path="/genealogy" element={<Genealogy />} />
          <Route path="/board" element={<Whiteboard />} />
          <Route path="/date" element={<DateCalc />} />
          <Route path="*" element={<Navigate to="/day" replace />} />
        </Routes>
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
