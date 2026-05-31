import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useCurrentDay } from '../api/currentDay.js'
import { dayToDate, dateToDay } from '../api/gameDate.js'
import { meta } from '../api/entities.js'
import { Input, TextArea, Btn, SectionHead } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import LinksPanel from './LinksPanel.jsx'

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const WEEKDAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const EV = meta('event')

// 'YYYY-MM-DD' (UTC) à partir d'un Date
function toISO(d) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

function EventEditor({ event, onChange, onClose, canEdit }) {
  const [title, setTitle] = useState(event.title || '')
  const [description, setDescription] = useState(event.description || '')
  const [date, setDate] = useState(event.date || '')

  const save = useCallback(async () => {
    await api.updateEvent(event.id, { title, description, date: date || null })
    onChange()
  }, [event.id, title, description, date, onChange])

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
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Input type="date" value={date || ''} readOnly={!canEdit}
          onChange={(e) => setDate(e.target.value)} onBlur={canEdit ? save : undefined}
          style={{ maxWidth: 180 }} />
        {dateToDay(date) && (
          <span style={{ fontSize: 12, color: 'var(--bp-text-muted)' }}>Jour {dateToDay(date)}</span>
        )}
      </div>
      <TextArea value={description} readOnly={!canEdit} rows={3}
        onChange={(e) => setDescription(e.target.value)} onBlur={canEdit ? save : undefined}
        placeholder="Description…" />
      <LinksPanel type="event" id={event.id} />
    </div>
  )
}

export default function CalendarView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [currentDay] = useCurrentDay()
  const [events, setEvents] = useState([])
  const [selectedId, setSelectedId] = useState(null)

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

  const todayISO = currentDay ? toISO(dayToDate(currentDay)) : null

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '24px 28px', overflowY: 'auto', height: '100%' }}>
      <SectionHead title="Calendrier">
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
      </SectionHead>

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
