import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useCurrentDay } from '../api/currentDay.js'
import { lookupItem } from '../api/itemCatalog.js'
import { Input, Btn, Badge, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'

const CAT_COLORS = {
  Contraption: '#E8913A',
  'Major Key': '#D4A843',
  'Vault Key': '#D4A843',
  Key: '#D4A843',
  Luxury: '#9B72CF',
  Resource: '#5BAD6E',
  Food: '#5BAD6E',
  Special: '#5B8EC9',
  Item: '#7A9BAE',
}

// Vignette d'illustration d'un item (ou placeholder si non catalogué).
export function ItemThumb({ name, size = 44 }) {
  const hit = lookupItem(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: 'var(--bp-panel)', border: '1px solid var(--bp-border)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    }}>
      {hit ? (
        <img src={hit.icon} alt={name} loading="lazy"
          style={{ width: '82%', height: '82%', objectFit: 'contain' }} />
      ) : (
        <Icons.box style={{ width: '55%', height: '55%', color: 'var(--bp-text-muted)' }} />
      )}
    </div>
  )
}

function ItemCard({ item, canEdit, onChange }) {
  const hit = lookupItem(item.name)
  const cat = hit?.cat
  const setQty = async (q) => {
    if (q < 0) return
    await api.updateItem(item.id, { ...item, quantity: q })
    onChange()
  }
  const remove = async () => {
    if (!confirm(`Retirer « ${item.name} » de l'inventaire ?`)) return
    await api.deleteItem(item.id)
    onChange()
  }

  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)',
      padding: 12, display: 'flex', gap: 12, alignItems: 'center',
    }}>
      <ItemThumb name={item.name} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--bp-text)' }}>{item.name}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
          {cat && <Badge color={CAT_COLORS[cat] || CAT_COLORS.Item} style={{ fontSize: 10, padding: '1px 6px' }}>{cat}</Badge>}
          {item.day_found != null && (
            <Badge style={{ fontSize: 10, padding: '1px 6px' }} title="Jour de découverte">
              <Icons.calendar width={10} height={10} /> J{item.day_found}
            </Badge>
          )}
        </div>
        {item.notes && <div style={{ fontSize: 12, color: 'var(--bp-text-dim)', marginTop: 4 }}>{item.notes}</div>}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
        {canEdit && (
          <button onClick={() => setQty((item.quantity || 0) - 1)} style={stepBtn} title="−1">−</button>
        )}
        <span style={{
          minWidth: 22, textAlign: 'center', fontWeight: 700, fontSize: 14, color: 'var(--bp-text)',
        }}>{item.quantity ?? 0}</span>
        {canEdit && (
          <>
            <button onClick={() => setQty((item.quantity || 0) + 1)} style={stepBtn} title="+1">+</button>
            <button onClick={remove} title="Supprimer" style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 4, marginLeft: 2,
            }}>
              <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const stepBtn = {
  width: 24, height: 24, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bp-panel)', border: '1px solid var(--bp-border)',
  color: 'var(--bp-text)', fontSize: 15, lineHeight: 1, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center',
}

export default function ItemsView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [items, setItems] = useState([])
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)
  const [query, setQuery] = useState('')
  const [currentDay] = useCurrentDay()

  const load = useCallback(() => api.listItems().then(setItems), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['items', 'crafts'])

  const matched = lookupItem(name)

  const add = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n) return
    // Si l'item existe déjà dans l'inventaire, on incrémente plutôt que dupliquer.
    const existing = items.find((i) => i.name.toLowerCase() === n.toLowerCase())
    if (existing) {
      await api.updateItem(existing.id, { ...existing, quantity: (existing.quantity || 0) + Number(qty || 1) })
    } else {
      await api.createItem({ name: n, quantity: Number(qty || 1), day_found: currentDay ?? null })
    }
    setName(''); setQty(1)
    load()
  }

  const q = query.trim().toLowerCase()
  const filtered = useMemo(
    () => (q ? items.filter((i) => i.name.toLowerCase().includes(q)) : items),
    [items, q]
  )
  const totalQty = items.reduce((s, i) => s + (i.quantity || 0), 0)

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Inventaire — items connus">
        <Badge style={{ fontSize: 11 }}>{items.length} connus · {totalQty} au total</Badge>
      </SectionHead>

      {canEdit && (
        <form onSubmit={add} style={{
          display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 260 }}>
            <ItemThumb name={name} size={40} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom exact de l'item découvert…"
            />
          </div>
          <Input
            type="number" min={1} value={qty}
            onChange={(e) => setQty(e.target.value)}
            style={{ width: 70 }}
            title="Quantité"
          />
          <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
            <Icons.plus style={{ width: 14, height: 14 }} /> Ajouter
          </Btn>
        </form>
      )}
      {canEdit && (
        <div style={{ fontSize: 11, color: matched ? '#5BAD6E' : 'var(--bp-text-muted)', marginBottom: 18, minHeight: 16 }}>
          {name.trim()
            ? (matched ? `✓ ${matched.name} reconnu — illustration disponible` : "Item libre (tape le nom exact pour révéler l'illustration)")
            : `Tape le nom complet d'un item pour le révéler${currentDay != null ? ` · sera daté du jour ${currentDay}` : ''}`}
        </div>
      )}

      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher dans l'inventaire…"
        style={{ maxWidth: 280, marginBottom: 18 }}
      />

      {filtered.length === 0 ? (
        <EmptyState
          icon={<Icons.box style={{ width: '100%', height: '100%' }} />}
          text={q ? 'Aucun item trouvé.' : 'Aucun item découvert pour le moment.'}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map((it) => <ItemCard key={it.id} item={it} canEdit={canEdit} onChange={load} />)}
        </div>
      )}
    </div>
  )
}
