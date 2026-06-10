import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useCurrentDay } from '../api/currentDay.js'
import { dayToDate, dateToDay } from '../api/gameDate.js'
import { meta } from '../api/entities.js'
import { Input, TextArea, Btn, SectionHead } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'
import LinksPanel from './LinksPanel.jsx'
import PhotosPanel from './PhotosPanel.jsx'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EV = meta('event')

// 'YYYY-MM-DD' (UTC) à partir d'un Date
function toISO(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

// 'YYYY-MM-DD' -> Date UTC
function fromISO(iso) {
  if (!iso) return null
  const d = new Date(iso + 'T00:00:00Z')
  return isNaN(d.getTime()) ? null : d
}


function EventEditor({ event, onChange, onClose, canEdit }) {
  const [title, setTitle] = useState(event.title || '')
  const [description, setDescription] = useState(event.description || '')
  const [date, setDate] = useState(event.date || '')
  const [endDate, setEndDate] = useState(event.end_date || '')

  const save = useCallback(async () => {
    await api.updateEvent(event.id, { title, description, date: date || null, end_date: endDate || null })
    onChange()
  }, [event.id, title, description, date, endDate, onChange])

  const remove = async () => {
    if (!confirm('Supprimer cet événement ?')) return
    await api.deleteEvent(event.id)
    onChange()
    onClose()
  }

  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10,
      border: `1px solid ${EV.color}55`, padding: 16,
      display: 'flex', flexDirection: 'column', gap: 10, marginTop: 16,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 18 }}>{EV.icon}</span>
        <Input value={title} readOnly={!canEdit}
          onChange={(e) => setTitle(e.target.value)} onBlur={canEdit ? save : undefined}
          placeholder="Titre de l'événement…" style={{ fontWeight: 600 }} />
        <button onClick={onClose} title="Fermer" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--bp-text-muted)', padding: 4, flexShrink: 0,
        }}>
          <Icons.close style={{ width: 14, height: 14 }} />
        </button>
        {canEdit && (
          <button onClick={remove} title="Supprimer" style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
          }}>
            <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
          </button>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--bp-text-muted)', minWidth: 40 }}>Début</span>
        <Input type="date" value={date || ''} readOnly={!canEdit}
          onChange={(e) => setDate(e.target.value)} onBlur={canEdit ? save : undefined}
          style={{ maxWidth: 180 }} />
        {dateToDay(date) && (
          <span style={{ fontSize: 12, color: 'var(--bp-text-muted)' }}>Jour {dateToDay(date)}</span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: 'var(--bp-text-muted)', minWidth: 40 }}>Fin</span>
        <Input type="date" value={endDate || ''} readOnly={!canEdit}
          onChange={(e) => setEndDate(e.target.value)} onBlur={canEdit ? save : undefined}
          style={{ maxWidth: 180 }} />
        {dateToDay(endDate) && (
          <span style={{ fontSize: 12, color: 'var(--bp-text-muted)' }}>Jour {dateToDay(endDate)}</span>
        )}
        <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>(optionnel — pour une durée)</span>
      </div>
      <TextArea value={description} readOnly={!canEdit} rows={3}
        onChange={(e) => setDescription(e.target.value)} onBlur={canEdit ? save : undefined}
        placeholder="Description…" />
      <LinksPanel type="event" id={event.id} />
      <PhotosPanel type="event" id={event.id} />
    </div>
  )
}

// Date courte « 15 nov 1993 »
function fmtShort(d) {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()].slice(0, 3)} ${d.getUTCFullYear()}`
}

const NODE_W = 210      // largeur d'un jalon
const TOP_H = 64        // hauteur réservée aux dates (au-dessus de la ligne)
const DOT = 18          // diamètre de la pastille
const LINE_Y = TOP_H + DOT / 2 // centre vertical des pastilles = position de la ligne

// Frise chronologique : ligne horizontale, pastilles, date au-dessus, événement en dessous
function TimelineView({ events, onSelect }) {
  // Événements datés, triés chronologiquement
  const items = useMemo(() => {
    return events
      .filter((e) => e.date)
      .map((e) => {
        const start = fromISO(e.date)
        const end = fromISO(e.end_date)
        return { ev: e, start, end: end && end < start ? null : end }
      })
      .filter((it) => it.start)
      .sort((a, b) => a.start - b.start || (a.ev.title || '').localeCompare(b.ev.title || ''))
  }, [events])

  if (!items.length) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: 'var(--bp-text-muted)' }}>
        Aucun événement daté à afficher sur la frise.
      </div>
    )
  }

  return (
    <div style={{ overflowX: 'auto', paddingBottom: 16 }}>
      <div style={{ position: 'relative', display: 'flex', width: 'max-content', padding: '0 8px' }}>
        {/* Ligne horizontale reliant la première à la dernière pastille */}
        <div style={{
          position: 'absolute', top: LINE_Y - 2, left: 8 + NODE_W / 2, right: 8 + NODE_W / 2,
          height: 4, background: 'var(--bp-accent)', borderRadius: 2,
        }} />

        {items.map((it) => {
          const gameDay = dateToDay(it.ev.date)
          const endGameDay = it.end ? dateToDay(it.ev.end_date) : null
          const big = gameDay
            ? (endGameDay && endGameDay !== gameDay ? `J${gameDay} → J${endGameDay}` : `Jour ${gameDay}`)
            : String(it.start.getUTCFullYear())
          const small = it.end
            ? `${fmtShort(it.start)} → ${fmtShort(it.end)}`
            : fmtShort(it.start)
          return (
            <div key={it.ev.id} style={{
              width: NODE_W, flexShrink: 0, padding: '0 12px',
              display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
            }}>
              {/* Date (au-dessus de la ligne) */}
              <div style={{
                height: TOP_H, display: 'flex', flexDirection: 'column',
                justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 8, gap: 2,
              }}>
                <span style={{ fontFamily: 'var(--font-heading)', fontSize: 18, fontWeight: 700, color: 'var(--bp-accent)' }}>{big}</span>
                <span style={{ fontSize: 11, color: 'var(--bp-text-muted)' }}>{small}</span>
              </div>

              {/* Pastille sur la ligne */}
              <button onClick={() => onSelect(it.ev.id)} title={it.ev.title || 'Sans titre'} style={{
                width: DOT, height: DOT, borderRadius: '50%', flexShrink: 0,
                background: 'var(--bp-surface)', border: '4px solid var(--bp-accent)',
                cursor: 'pointer', padding: 0, position: 'relative', zIndex: 1,
              }} />

              {/* Événement (en dessous de la ligne) */}
              <div style={{ marginTop: 12 }}>
                <button onClick={() => onSelect(it.ev.id)} style={{
                  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                  fontSize: 13, fontWeight: 600, color: 'var(--bp-text)', lineHeight: 1.3,
                }}>
                  {it.ev.title || 'Sans titre'}
                </button>
                {it.ev.description && (
                  <div style={{ marginTop: 5, fontSize: 12, color: 'var(--bp-text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>
                    {it.ev.description}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function CalendarView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const isMobile = useIsMobile()
  const [currentDay] = useCurrentDay()
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [mode, setMode] = useState('timeline') // 'month' | 'timeline'

  // Mois affiché par défaut : celui de la date du jour de jeu courant
  const initial = useMemo(() => {
    const d = dayToDate(currentDay) || dayToDate(1)
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [view, setView] = useState(initial)

  const load = useCallback(() => api.listEvents().then(setEvents), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['events'])

  const byDate = useMemo(() => {
    const map = {}
    for (const ev of events) {
      if (!ev.date) continue
      ;(map[ev.date] ||= []).push(ev)
    }
    return map
  }, [events])

  const selected = events.find((e) => e.id === selectedId) || null

  // Construction de la grille du mois (semaine commençant le lundi)
  const cells = useMemo(() => {
    const first = new Date(Date.UTC(view.y, view.m, 1))
    const lead = (first.getUTCDay() + 6) % 7 // lundi = 0
    const daysInMonth = new Date(Date.UTC(view.y, view.m + 1, 0)).getUTCDate()
    const out = []
    for (let i = 0; i < lead; i++) out.push(null)
    for (let d = 1; d <= daysInMonth; d++) out.push(new Date(Date.UTC(view.y, view.m, d)))
    while (out.length % 7 !== 0) out.push(null)
    return out
  }, [view])

  const shiftMonth = (delta) => {
    setView((v) => {
      const d = new Date(Date.UTC(v.y, v.m + delta, 1))
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() }
    })
  }

  const goToday = () => {
    const d = dayToDate(currentDay) || dayToDate(1)
    setView({ y: d.getUTCFullYear(), m: d.getUTCMonth() })
  }

  const addEvent = async (iso) => {
    const ev = await api.createEvent({ title: 'Nouvel événement', description: '', date: iso })
    await load()
    setSelectedId(ev.id)
  }

  // Ajout d'un événement depuis la frise : daté du jour de jeu courant (ou aujourd'hui)
  const addEventTimeline = () => {
    const d = dayToDate(currentDay) || new Date()
    addEvent(toISO(d))
  }

  const todayISO = currentDay ? toISO(dayToDate(currentDay)) : null

  return (
    <div style={{ maxWidth: mode === 'timeline' ? 1400 : 1000, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px', overflowY: 'auto', height: '100%' }}>
      <SectionHead title="Calendrier">
        {mode === 'month' && (
          <>
            <Btn small variant="ghost" onClick={() => shiftMonth(-1)}>
              <Icons.chevL style={{ width: 14, height: 14 }} />
            </Btn>
            <span style={{ minWidth: 150, textAlign: 'center', fontWeight: 600, color: 'var(--bp-text)', textTransform: 'capitalize' }}>
              {MONTHS[view.m]} {view.y}
            </span>
            <Btn small variant="ghost" onClick={() => shiftMonth(1)}>
              <Icons.chevR style={{ width: 14, height: 14 }} />
            </Btn>
            <Btn small variant="default" onClick={goToday}>Aujourd'hui (jeu)</Btn>
          </>
        )}
        {mode === 'timeline' && canEdit && (
          <Btn small variant="default" onClick={addEventTimeline}>+ Événement</Btn>
        )}
        <div style={{ display: 'inline-flex', gap: 4, marginLeft: 8 }}>
          <Btn small variant={mode === 'month' ? 'accent' : 'ghost'} onClick={() => setMode('month')}>Mois</Btn>
          <Btn small variant={mode === 'timeline' ? 'accent' : 'ghost'} onClick={() => setMode('timeline')}>Timeline</Btn>
        </div>
      </SectionHead>

      {mode === 'timeline' ? (
        <TimelineView events={events} onSelect={setSelectedId} />
      ) : (
      <>
      {/* En-têtes jours */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, color: 'var(--bp-text-muted)' }}>{w}</div>
        ))}
      </div>

      {/* Grille */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />
          const iso = toISO(d)
          const gameDay = dateToDay(iso)
          const dayEvents = byDate[iso] || []
          const isToday = iso === todayISO
          return (
            <div key={i}
              onClick={canEdit ? () => addEvent(iso) : undefined}
              style={{
                minHeight: 84, padding: 6, borderRadius: 6,
                background: 'var(--bp-surface)',
                border: isToday ? '1px solid var(--bp-accent)' : '1px solid var(--bp-border)',
                cursor: canEdit ? 'pointer' : 'default',
                display: 'flex', flexDirection: 'column', gap: 3,
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--bp-text-dim)' }}>{d.getUTCDate()}</span>
                {gameDay && (
                  <span style={{ fontSize: 9, color: 'var(--bp-text-muted)', fontFamily: 'var(--font-mono)' }}>J{gameDay}</span>
                )}
              </div>
              {dayEvents.map((ev) => (
                <button key={ev.id}
                  onClick={(e) => { e.stopPropagation(); setSelectedId(ev.id) }}
                  title={ev.title}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 4, textAlign: 'left',
                    padding: '2px 5px', borderRadius: 4, cursor: 'pointer',
                    background: EV.color + '22', border: `1px solid ${EV.color}44`,
                    color: 'var(--bp-text)', fontSize: 10, width: '100%',
                    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                  }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: EV.color, flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{ev.title || 'Sans titre'}</span>
                </button>
              ))}
            </div>
          )
        })}
      </div>
      </>
      )}

      {selected && (
        <EventEditor key={selected.id} event={selected} canEdit={canEdit}
          onChange={load} onClose={() => setSelectedId(null)} />
      )}

      {/* Événements sans date */}
      {events.some((e) => !e.date) && (
        <div style={{ marginTop: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--bp-text-muted)', marginBottom: 8 }}>Sans date</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {events.filter((e) => !e.date).map((ev) => (
              <button key={ev.id} onClick={() => setSelectedId(ev.id)} style={{
                padding: '4px 10px', borderRadius: 6, cursor: 'pointer',
                background: EV.color + '22', border: `1px solid ${EV.color}44`,
                color: 'var(--bp-text)', fontSize: 12,
              }}>{ev.title || 'Sans titre'}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
