import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { lookupItem } from '../api/itemCatalog.js'
import { suggestCrafts } from '../api/craftLogic.js'
import { Input, Btn, Badge } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { ItemThumb } from './ItemsView.jsx'
import CraftCard from './CraftCard.jsx'

// Onglet « Items & crafts du run » de la page du jour.
// Liste les items trouvés pendant la run + les crafts (découverts) réalisables avec.
export default function RunItemsPanel({ day, canEdit }) {
  const [runItems, setRunItems] = useState([])
  const [discovered, setDiscovered] = useState([])
  const [name, setName] = useState('')
  const [qty, setQty] = useState(1)

  const load = useCallback(() => {
    if (day == null) return
    api.listRunItems(day).then(setRunItems)
    api.listCrafts().then(setDiscovered)
  }, [day])
  useEffect(() => { load() }, [load])
  useWs(load, ['run-items', 'crafts', 'items'])

  const matched = lookupItem(name)
  const discoveredNames = useMemo(() => discovered.map((c) => c.name), [discovered])
  const { craftable, missingOne } = useMemo(
    () => suggestCrafts(runItems, discoveredNames),
    [runItems, discoveredNames]
  )

  const add = async (e) => {
    e.preventDefault()
    const n = name.trim()
    if (!n || day == null) return
    await api.addRunItem({ day_number: day, name: n, quantity: Number(qty || 1) })
    setName(''); setQty(1)
    load()
  }

  const setItemQty = async (it, q) => {
    await api.updateRunItem(it.id, { quantity: q })
    load()
  }
  const remove = async (it) => {
    await api.deleteRunItem(it.id)
    load()
  }

  // Crafter pendant la run : le résultat rejoint les items du run.
  const craft = async (c) => {
    await api.addRunItem({ day_number: day, name: c.result, quantity: 1 })
    load()
  }

  if (day == null) {
    return <div style={{ padding: 16, fontSize: 13, color: 'var(--bp-text-muted)' }}>Aucun jour sélectionné.</div>
  }

  const total = runItems.reduce((s, i) => s + (i.quantity || 0), 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto', padding: 14, gap: 16 }}>
      {/* Ajout d'item trouvé pendant la run */}
      {canEdit && (
        <form onSubmit={add} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <ItemThumb name={name} size={36} />
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Item trouvé…" autoFocus />
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 56 }} />
            <Btn type="submit" variant="accent" small style={{ flexShrink: 0 }}>
              <Icons.plus style={{ width: 13, height: 13 }} />
            </Btn>
          </div>
          <div style={{ fontSize: 10, color: matched ? '#5BAD6E' : 'var(--bp-text-muted)' }}>
            {name.trim() ? (matched ? `✓ ${matched.name}` : 'Item libre (nom exact = illustration)') : 'Items trouvés pendant cette run'}
          </div>
        </form>
      )}

      {/* Liste des items du run */}
      <div>
        <SubHead title="Items du run" badge={`${runItems.length} · ${total}`} color="#5B8EC9" />
        {runItems.length === 0 ? (
          <Empty text="Aucun item trouvé ce jour." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {runItems.map((it) => (
              <div key={it.id} style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px',
                borderRadius: 8, background: 'var(--bp-panel)', border: '1px solid var(--bp-border)',
              }}>
                <ItemThumb name={it.name} size={30} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: 'var(--bp-text)' }}>{it.name}</span>
                {canEdit && <button onClick={() => setItemQty(it, (it.quantity || 0) - 1)} style={stepBtn}>−</button>}
                <span style={{ minWidth: 18, textAlign: 'center', fontWeight: 700, fontSize: 13, color: 'var(--bp-text)' }}>{it.quantity}</span>
                {canEdit && <button onClick={() => setItemQty(it, (it.quantity || 0) + 1)} style={stepBtn}>+</button>}
                {canEdit && (
                  <button onClick={() => remove(it)} title="Retirer" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}>
                    <Icons.trash style={{ width: 13, height: 13, color: '#E87070' }} />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crafts possibles avec les items du run (parmi les découverts) */}
      <div>
        <SubHead title="Crafts réalisables" badge={craftable.length} color="#5BAD6E" />
        {craftable.length === 0 ? (
          <Empty text="Aucun craft découvert réalisable avec ces items." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {craftable.map((c) => (
              <CraftCard key={c.result} craft={c} action={canEdit && (
                <Btn variant="accent" small onClick={() => craft(c)} style={{ alignSelf: 'flex-start' }}>
                  <Icons.craft style={{ width: 13, height: 13 }} /> Crafter
                </Btn>
              )} />
            ))}
          </div>
        )}
      </div>

      {missingOne.length > 0 && (
        <div>
          <SubHead title="À un item près" badge={missingOne.length} color="#E8913A" />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missingOne.map((c) => <CraftCard key={c.result} craft={c} missingName={c.missing[0]?.name} />)}
          </div>
        </div>
      )}
    </div>
  )
}

const stepBtn = {
  width: 22, height: 22, borderRadius: 6, cursor: 'pointer',
  background: 'var(--bp-bg)', border: '1px solid var(--bp-border)',
  color: 'var(--bp-text)', fontSize: 14, lineHeight: 1, display: 'inline-flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

function SubHead({ title, badge, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
      <span style={{ fontFamily: 'var(--font-heading)', fontSize: 14, fontWeight: 600, color: 'var(--bp-text)' }}>{title}</span>
      <Badge color={color} style={{ fontSize: 10 }}>{badge}</Badge>
    </div>
  )
}

function Empty({ text }) {
  return <div style={{ fontSize: 12, color: 'var(--bp-text-muted)', padding: '2px 0 4px' }}>{text}</div>
}
