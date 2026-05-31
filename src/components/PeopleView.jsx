import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, TextArea, Select, Btn, Badge, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import LinksPanel from './LinksPanel.jsx'

const STATUS_COLORS = {
  Actif:      '#5BAD6E',
  Décédé:     '#7A9BAE',
  Suspect:    '#C85454',
  Allié:      '#5B8EC9',
  Historique: '#9B72CF',
  Neutre:     '#D4A843',
}

const STATUS_OPTIONS = Object.keys(STATUS_COLORS)

const EMPTY = { name: '', role: '', day_met: '', status: '', notes: '' }

const iconBtn = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: 4,
  borderRadius: 4,
  display: 'inline-flex',
  alignItems: 'center',
  lineHeight: 1,
  color: 'var(--bp-text-muted)',
}

function PersonForm({ initial = {}, onSave, onCancel }) {
  const [form, setForm] = useState({
    ...EMPTY,
    ...initial,
    day_met: initial.day_met != null ? String(initial.day_met) : '',
  })

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    onSave({
      name:    form.name.trim(),
      role:    form.role.trim(),
      day_met: form.day_met !== '' ? Number(form.day_met) : null,
      status:  form.status,
      notes:   form.notes,
    })
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Nom *</label>
          <Input value={form.name} onChange={set('name')} placeholder="Nom de la personne" autoFocus />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Rôle</label>
          <Input value={form.role} onChange={set('role')} placeholder="ex. Majordome, Héritier…" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Jour rencontré</label>
          <Input type="number" min="1" value={form.day_met} onChange={set('day_met')} placeholder="N° du jour" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Statut</label>
          <Select value={form.status} onChange={set('status')}>
            <option value="">— aucun —</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
      </div>
      <div>
        <label style={{ fontSize: 11, color: 'var(--bp-text-muted)', display: 'block', marginBottom: 4 }}>Notes</label>
        <TextArea value={form.notes} onChange={set('notes')} rows={3} placeholder="Informations, indices, observations…" />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <Btn type="submit" variant="accent">Enregistrer</Btn>
        <Btn type="button" variant="default" onClick={onCancel}>Annuler</Btn>
      </div>
    </form>
  )
}

export default function PeopleView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [people, setPeople] = useState([])
  const [editing, setEditing] = useState(null)
  const [q, setQ] = useState('')

  const load = useCallback(() => api.listPeople().then(setPeople), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['people', 'links'])

  const filtered = useMemo(() => {
    const lq = q.toLowerCase()
    if (!lq) return people
    return people.filter((p) =>
      p.name?.toLowerCase().includes(lq) ||
      p.role?.toLowerCase().includes(lq) ||
      p.notes?.toLowerCase().includes(lq) ||
      p.status?.toLowerCase().includes(lq)
    )
  }, [people, q])

  const save = async (form) => {
    if (editing?.id) await api.updatePerson(editing.id, form)
    else await api.createPerson(form)
    setEditing(null)
    load()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer cette personne ?')) return
    await api.deletePerson(id)
    load()
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 28px' }}>
      <SectionHead title="Personnes">
        <div style={{ position: 'relative' }}>
          <Icons.search style={{
            width: 14, height: 14,
            position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)',
            color: 'var(--bp-text-muted)', pointerEvents: 'none',
          }} />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher…"
            style={{ paddingLeft: 30, width: 180 }}
          />
        </div>
        {canEdit && (
          <Btn variant="accent" onClick={() => setEditing({})}>
            <Icons.plus style={{ width: 14, height: 14 }} />
            Personne
          </Btn>
        )}
      </SectionHead>

      {editing !== null && (
        <div style={{
          background: 'var(--bp-surface)',
          borderRadius: 10,
          border: '1px solid var(--bp-border)',
          padding: 20,
          marginBottom: 20,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--bp-text-dim)', marginBottom: 14 }}>
            {editing.id ? 'Modifier la personne' : 'Nouvelle personne'}
          </div>
          <PersonForm initial={editing} onSave={save} onCancel={() => setEditing(null)} />
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icons.people style={{ width: '100%', height: '100%' }} />}
          text={q ? 'Aucune personne ne correspond à la recherche.' : 'Aucune personne enregistrée.'}
        />
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 12,
        }}>
          {filtered.map((p) => (
            <div key={p.id} style={{
              background: 'var(--bp-surface)',
              borderRadius: 10,
              border: '1px solid var(--bp-border)',
              padding: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--bp-text)', lineHeight: 1.3 }}>
                    {p.name}
                  </div>
                  {p.role && (
                    <div style={{ fontSize: 12, color: 'var(--bp-text-dim)', marginTop: 2 }}>{p.role}</div>
                  )}
                </div>
                {canEdit && (
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button
                      style={iconBtn}
                      title="Modifier"
                      onClick={() => setEditing(p)}
                    >
                      <Icons.edit style={{ width: 14, height: 14 }} />
                    </button>
                    <button
                      style={{ ...iconBtn, color: '#E87070' }}
                      title="Supprimer"
                      onClick={() => remove(p.id)}
                    >
                      <Icons.trash style={{ width: 14, height: 14 }} />
                    </button>
                  </div>
                )}
              </div>

              {/* Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {p.status && (
                  <Badge color={STATUS_COLORS[p.status] || '#7A9BAE'}>{p.status}</Badge>
                )}
                {p.day_met != null && (
                  <Badge>
                    <Icons.calendar style={{ width: 10, height: 10 }} />
                    Days {String(p.day_met).padStart(2, '0')}
                  </Badge>
                )}
              </div>

              {/* Notes */}
              {p.notes && (
                <p style={{
                  margin: 0,
                  fontSize: 12,
                  color: 'var(--bp-text-dim)',
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.55,
                }}>
                  {p.notes}
                </p>
              )}

              {/* Links */}
              <LinksPanel type="person" id={p.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
