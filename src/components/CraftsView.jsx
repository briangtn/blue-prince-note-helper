import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { useCurrentDay } from '../api/currentDay.js'
import { CRAFT_CATALOG } from '../api/craftCatalog.js'
import { suggestCrafts, buildInventory, evaluateCraft } from '../api/craftLogic.js'
import { Btn, Badge, SectionHead, EmptyState } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { ItemThumb } from './ItemsView.jsx'

// Flèche entre ingrédients et résultat.
function Arrow() {
  return <span style={{ color: 'var(--bp-text-muted)', fontSize: 18, padding: '0 2px' }}>→</span>
}

// Bloc « ingrédient » : vignette + nom + (manquant ?).
function Ingredient({ ing }) {
  const missing = ing.ok === false
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 4px',
      borderRadius: 8, background: missing ? '#C8545418' : 'var(--bp-panel)',
      border: `1px solid ${missing ? '#C8545455' : 'var(--bp-border)'}`,
      opacity: missing ? 1 : 1,
    }} title={missing ? 'Item manquant' : `Tu possèdes ${ing.have}`}>
      <ItemThumb name={ing.name} size={28} />
      <span style={{ fontSize: 12, color: missing ? '#E87070' : 'var(--bp-text)', whiteSpace: 'nowrap' }}>
        {ing.qty > 1 ? `${ing.qty}× ` : ''}{ing.name}
      </span>
    </div>
  )
}

// Carte d'une recette révélée.
function CraftCard({ craft, action, missingName }) {
  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {(craft.ingredients || craft.inputs).map((ing, i) => (
          <Ingredient key={i} ing={ing.ok === undefined ? { ...ing, ok: undefined } : ing} />
        ))}
        <Arrow />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px 3px 4px',
          borderRadius: 8, background: 'var(--bp-accent)18', border: '1px solid var(--bp-accent)55' }}>
          <ItemThumb name={craft.result} size={32} />
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--bp-text)' }}>{craft.result}</span>
        </div>
      </div>
      {craft.effect && <div style={{ fontSize: 12, color: 'var(--bp-text-dim)' }}>{craft.effect}</div>}
      {missingName && (
        <div style={{ fontSize: 12, color: '#E8913A' }}>
          ⚠️ Il te manque <strong>{missingName}</strong> pour réaliser ce craft.
        </div>
      )}
      {action}
    </div>
  )
}

export default function CraftsView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const [items, setItems] = useState([])
  const [discovered, setDiscovered] = useState([])
  const [currentDay] = useCurrentDay()
  const [selected, setSelected] = useState(() => new Set())
  const [benchOpen, setBenchOpen] = useState(false)

  const load = useCallback(() => {
    api.listItems().then(setItems)
    api.listCrafts().then(setDiscovered)
  }, [])
  useEffect(() => { load() }, [load])
  useWs(load, ['items', 'crafts'])

  const { craftable, missingOne } = useMemo(() => suggestCrafts(items), [items])
  const discoveredNames = useMemo(() => new Set(discovered.map((c) => c.name)), [discovered])

  // Débloque un craft : enregistre la recette découverte + ajoute le résultat à l'inventaire.
  const unlock = async (craft) => {
    if (!discoveredNames.has(craft.result)) {
      await api.createCraft({ name: craft.result, ingredients: craft.inputs, result_qty: 1, notes: craft.effect || null })
    }
    const existing = items.find((i) => i.name.toLowerCase() === craft.result.toLowerCase())
    if (existing) {
      await api.updateItem(existing.id, { ...existing, quantity: (existing.quantity || 0) + 1 })
    } else {
      await api.createItem({ name: craft.result, quantity: 1, day_found: currentDay ?? null })
    }
    load()
  }

  const removeDiscovered = async (c) => {
    if (!confirm(`Oublier le craft « ${c.name} » ?`)) return
    await api.deleteCraft(c.id)
    load()
  }

  // --- Établi : recettes révélées par la sélection d'items ---
  const toggle = (name) => setSelected((prev) => {
    const next = new Set(prev)
    next.has(name) ? next.delete(name) : next.add(name)
    return next
  })
  const benchInv = useMemo(() => buildInventory(items.filter((i) => selected.has(i.name))), [items, selected])
  const benchMatches = useMemo(() => {
    if (selected.size === 0) return []
    return CRAFT_CATALOG
      .map((c) => evaluateCraft(c, benchInv))
      .filter((c) => c.status === 'craftable')
  }, [benchInv, selected])

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Crafts" />

      {/* Réalisables maintenant */}
      <Section
        title="Réalisables maintenant"
        count={craftable.length}
        color="#5BAD6E"
        empty="Aucun craft réalisable avec ton inventaire actuel."
      >
        {craftable.map((c) => (
          <CraftCard key={c.result} craft={c} action={canEdit && (
            <Btn variant="accent" small onClick={() => unlock(c)} style={{ alignSelf: 'flex-start' }}>
              <Icons.craft style={{ width: 14, height: 14 }} />
              {discoveredNames.has(c.result) ? 'Crafter à nouveau' : 'Débloquer le craft'}
            </Btn>
          )} />
        ))}
      </Section>

      {/* À un item près */}
      <Section
        title="À un item près"
        count={missingOne.length}
        color="#E8913A"
        empty="Rien à un seul item près pour le moment."
      >
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
              Sélectionne des items de ton inventaire ; les recettes correspondantes apparaissent automatiquement.
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
                      <ItemThumb name={it.name} size={24} />
                      {it.name}
                    </button>
                  )
                })}
              </div>
            )}
            {benchMatches.length > 0 && (
              <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {benchMatches.map((c) => (
                  <CraftCard key={c.result} craft={c} action={canEdit && (
                    <Btn variant="accent" small onClick={() => unlock(c)} style={{ alignSelf: 'flex-start' }}>
                      <Icons.craft style={{ width: 14, height: 14 }} /> Débloquer le craft
                    </Btn>
                  )} />
                ))}
              </div>
            )}
            {selected.size > 0 && benchMatches.length === 0 && (
              <div style={{ marginTop: 12, fontSize: 12, color: 'var(--bp-text-muted)' }}>
                Aucune recette connue pour cette combinaison.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Crafts découverts */}
      <Section
        title="Crafts découverts"
        count={discovered.length}
        color="#9B72CF"
        empty="Aucun craft débloqué pour l'instant."
      >
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
