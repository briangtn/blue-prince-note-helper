import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, Btn, SectionHead, EmptyState, CODE_STATUSES } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import LinksPanel from './LinksPanel.jsx'
import PhotosPanel from './PhotosPanel.jsx'

const STATUS_ORDER = ['confirmed', 'pending', 'tried', 'rejected']
const STATUS_CYCLE = { pending: 'tried', tried: 'confirmed', confirmed: 'rejected', rejected: 'pending' }

export default function CodesView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [codes, setCodes] = useState([])
  const [value, setValue] = useState('')
  const [context, setContext] = useState('')

  const load = useCallback(() => api.listCodes().then(setCodes), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['codes'])

  const add = async (e) => {
    e.preventDefault()
    if (!value.trim()) return
    await api.createCode({ value: value.trim(), context: context.trim() })
    setValue('')
    setContext('')
    load()
  }

  const cycle = async (c) => {
    const next = STATUS_CYCLE[c.status] || 'pending'
    await api.updateCode(c.id, { status: next })
    load()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce code ?')) return
    await api.deleteCode(id)
    load()
  }

  const sorted = [...codes].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  )

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: '24px 28px' }}>
      <SectionHead title="Codes" />

      {/* Add form */}
      {canEdit && (
        <form onSubmit={add} style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          background: 'var(--bp-surface)',
          borderRadius: 10,
          border: '1px solid var(--bp-border)',
          padding: 14,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Code (ex: 1234)"
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 15,
              fontWeight: 700,
              width: 120,
              flexShrink: 0,
            }}
          />
          <Input
            value={context}
            onChange={(e) => setContext(e.target.value)}
            placeholder="Contexte / où trouvé…"
            style={{ flex: '1 1 160px' }}
          />
          <Btn type="submit" variant="accent">
            <Icons.plus style={{ width: 14, height: 14 }} />
            Ajouter
          </Btn>
        </form>
      )}

      {/* Code list */}
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Icons.key style={{ width: '100%', height: '100%' }} />}
          text="Aucun code noté."
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map((c) => {
            const st = CODE_STATUSES[c.status] || CODE_STATUSES.pending
            return (
              <div key={c.id} style={{
                background: 'var(--bp-surface)',
                borderRadius: 8,
                border: '1px solid var(--bp-border)',
                padding: '12px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {/* Value */}
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    color: 'var(--bp-text)',
                    minWidth: 60,
                    flexShrink: 0,
                  }}>
                    {c.value}
                  </span>

                  {/* Context */}
                  <span style={{
                    flex: 1,
                    fontSize: 13,
                    color: 'var(--bp-text-dim)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {c.context}
                  </span>

                  {/* Status cycle button */}
                  <button
                    onClick={canEdit ? () => cycle(c) : undefined}
                    title={canEdit ? 'Cliquer pour changer le statut' : st.label}
                    style={{
                      background: st.color + '22',
                      border: `1px solid ${st.color}55`,
                      color: st.color,
                      padding: '4px 10px',
                      borderRadius: 5,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: canEdit ? 'pointer' : 'default',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    {st.label}
                  </button>

                  {/* Delete */}
                  {canEdit && (
                    <button
                      onClick={() => remove(c.id)}
                      title="Supprimer"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--bp-text-muted)',
                        fontSize: 16,
                        lineHeight: 1,
                        padding: '2px 4px',
                        borderRadius: 4,
                        flexShrink: 0,
                      }}
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Links */}
                <LinksPanel type="code" id={c.id} />
                <PhotosPanel type="code" id={c.id} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
