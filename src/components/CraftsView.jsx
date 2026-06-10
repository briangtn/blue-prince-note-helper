import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { CRAFT_CATALOG, lookupCraft } from '../api/craftCatalog.js'
import { suggestCrafts, buildInventory, evaluateCraft } from '../api/craftLogic.js'
import { Input, Btn, Badge, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'
import { ItemThumb } from './ItemsView.jsx'
import CraftCard from './CraftCard.jsx'

export default function CraftsView() {
  const { role } = useAuth()
  const isMobile = useIsMobile()
  const canEdit = role !== 'ro'
  const [items, setItems] = useState([])
  const [discovered, setDiscovered] = useState([])
  const [name, setName] = useState('')
  const [selected, setSelected] = useState(() => new Set())
  const [benchOpen, setBenchOpen] = useState(false)

  const load = useCallback(() => {
    api.listItems().then(setItems)
    api.listCrafts().then(setDiscovered)
  }, [])
  useEffect(() => { load() }, [load])
  useWs(load, ['items', 'crafts'])

  const discoveredNames = useMemo(() => discovered.map((c) => c.name), [discovered])
  const discoveredSet = useMemo(() => new Set(discoveredNames.map((n) => n.toLowerCase())), [discoveredNames])
  // Suggestions uniquement parmi les crafts DÉJÀ découverts (jamais de spoil).
  const { craftable, missingOne } = useMemo(
    () => suggestCrafts(items, discoveredNames),
    [items, discoveredNames]
  )

  // Découvre un craft en tapant son nom exact (le serveur enregistre aussi le résultat comme item connu).
  const matched = lookupCraft(name)
  const discover = async (e) => {
    e.preventDefault()
    const craft = lookupCraft(name)
    if (!craft) return
    if (!discoveredSet.has(craft.result.toLowerCase())) {
      await api.createCraft({ name: craft.result, ingredients: craft.inputs, result_qty: 1, notes: craft.effect || null })
    }
    setName('')
    load()
  }

  // Crafter : ajoute le résultat à l'inventaire permanent.
  const craft = async (c) => {
    const existing = items.find((i) => i.name.toLowerCase() === c.result.toLowerCase())
    if (existing) await api.updateItem(existing.id, { ...existing, quantity: (existing.quantity || 0) + 1 })
    else await api.createItem({ name: c.result, quantity: 1 })
    load()
  }

  const removeDiscovered = async (c) => {
    if (!confirm(`Oublier le craft « ${c.name} » ?`)) return
    await api.deleteCraft(c.id)
    load()
  }

  // --- Établi : recettes (découvertes) révélées par la sélection d'items ---
  const toggle = (n) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(n) ? next.delete(n) : next.add(n)
    return next
  })
  const benchInv = useMemo(() => buildInventory(items.filter((i) => selected.has(i.name))), [items, selected])
  const benchMatches = useMemo(() => {
    if (selected.size === 0) return []
    return CRAFT_CATALOG
      .filter((c) => discoveredSet.has(c.result.toLowerCase()))
      .map((c) => evaluateCraft(c, benchInv))
      .filter((c) => c.status === 'craftable')
  }, [benchInv, selected, discoveredSet])

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Crafts" />

      {/* Découvrir un craft par son nom */}
      {canEdit && (
        <div style={{ marginBottom: 24 }}>
          <form onSubmit={discover} style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <ItemThumb name={matched?.result} size={40} />
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom exact d'un craft à découvrir…"
              style={{ flex: 1, minWidth: isMobile ? 0 : 240 }}
            />
            <Btn type="submit" variant="accent" disabled={!matched} style={{ flexShrink: 0 }}>
              <Icons.craft style={{ width: 14, height: 14 }} /> Découvrir
            </Btn>
          </form>
          <div style={{ fontSize: 11, color: matched ? '#5BAD6E' : 'var(--bp-text-muted)', marginTop: 6 }}>
            {name.trim()
              ? (matched
                  ? (discoveredSet.has(matched.result.toLowerCase()) ? `✓ ${matched.result} déjà découvert` : `✓ ${matched.result} reconnu`)
                  : 'Craft inconnu (tape le nom exact du résultat)')
              : "Tape le nom d'un craft pour l'ajouter à tes recettes découvertes. Seuls les crafts découverts sont suggérés."}
          </div>
        </div>
      )}

      {/* Réalisables maintenant (parmi les découverts) */}
      <Section title="Réalisables maintenant" count={craftable.length} color="#5BAD6E"
        empty="Aucun craft découvert réalisable avec ton inventaire.">
        {craftable.map((c) => (
          <CraftCard key={c.result} craft={c} action={canEdit && (
            <Btn variant="accent" small onClick={() => craft(c)} style={{ alignSelf: 'flex-start' }}>
              <Icons.craft style={{ width: 14, height: 14 }} /> Crafter
            </Btn>
          )} />
        ))}
      </Section>

      {/* À un item près (parmi les découverts) */}
      <Section title="À un item près" count={missingOne.length} color="#E8913A"
        empty="Rien à un seul item près parmi tes crafts découverts.">
        {missingOne.map((c) => (
          <CraftCard key={c.result} craft={c} missingName={c.missing[0]?.name} />
        ))}
      </Section>

      {/* Établi : combiner des items sélectionnés */}
      <div style={{ marginBottom: 28 }}>
        <button onClick={() => setBenchOpen((v) => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--bp-text)', fontFamily: 'var(--font-heading)',
          fontSize: 16, fontWeight: 600, padding: 0, marginBottom: 12,
        }}>
          <Icons.chevR style={{ width: 14, height: 14, transform: benchOpen ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }} />
          Établi — combiner des items
        </button>
        {benchOpen && (
          <div style={{ background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)', padding: 14 }}>
            <div style={{ fontSize: 12, color: 'var(--bp-text-muted)', marginBottom: 10 }}>
              Sélectionne des items ; les recettes <strong>découvertes</strong> correspondantes apparaissent.
            </div>
            {items.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--bp-text-muted)' }}>Aucun item découvert.</div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {items.map((it) => {
                  const on = selected.has(it.name)
                  return (
                    <button key={it.id} onClick={() => toggle(it.name)} style={{
                      display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px 4px 4px',
                      borderRadius: 999, cursor: 'pointer', fontSize: 12,
                      background: on ? 'var(--bp-accent)22' : 'var(--bp-panel)',
                      border: on ? '1px solid var(--bp-accent)' : '1px solid var(--bp-border)',
                      color: on ? 'var(--bp-accent)' : 'var(--bp-text-dim)',
                    }}>
                      <ItemThumb name={it.name} size={24} />{it.name}
                    </button>
                  )
                })}
              </div>
            )}
            {benchMatches.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {benchMatches.map((c) => (
                  <CraftCard key={c.result} craft={c} action={canEdit && (
                    <Btn variant="accent" small onClick={() => craft(c)} style={{ alignSelf: 'flex-start' }}>
                      <Icons.craft style={{ width: 14, height: 14 }} /> Crafter
                    </Btn>
                  )} />
                ))}
              </div>
            )}
            {selected.size > 0 && benchMatches.length === 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bp-text-muted)' }}>
                Aucune recette découverte ne correspond à cette combinaison.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crafts découverts */}
      <Section title="Crafts découverts" count={discovered.length} color="#9B72CF"
        empty="Aucun craft découvert. Tape le nom d'un craft ci-dessus pour commencer.">
        {discovered.map((c) => (
          <CraftCard
            key={c.id}
            craft={{ result: c.name, ingredients: c.ingredients || [], effect: c.notes }}
            action={canEdit && (
              <Btn variant="ghost" small onClick={() => removeDiscovered(c)} style={{ alignSelf: 'flex-start', color: '#E87070' }}>
                <Icons.trash style={{ width: 13, height: 13 }} /> Oublier
              </Btn>
            )}
          />
        ))}
      </Section>
    </div>
  )
}

function Section({ title, count, color, empty, children }) {
  const arr = Array.isArray(children) ? children.filter(Boolean) : (children ? [children] : [])
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <h3 style={{ fontFamily: 'var(--font-heading)', fontSize: 16, fontWeight: 600, color: 'var(--bp-text)', margin: 0 }}>{title}</h3>
        <Badge color={color} style={{ fontSize: 10 }}>{count}</Badge>
      </div>
      {arr.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--bp-text-muted)', padding: '4px 2px' }}>{empty}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
      )}
    </div>
  )
}
