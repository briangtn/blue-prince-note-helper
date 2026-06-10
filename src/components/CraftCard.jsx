import { ItemThumb } from './ItemsView.jsx'

// Flèche entre ingrédients et résultat.
function Arrow() {
  return <span style={{ color: 'var(--bp-text-muted)', fontSize: 18, padding: '0 2px' }}>→</span>
}

// Bloc « ingrédient » : vignette + nom (rouge si manquant).
function Ingredient({ ing }) {
  const missing = ing.ok === false
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, padding: '3px 8px 3px 4px',
      borderRadius: 8, background: missing ? '#C8545418' : 'var(--bp-panel)',
      border: `1px solid ${missing ? '#C8545455' : 'var(--bp-border)'}`,
    }} title={missing ? 'Item manquant' : (ing.have != null ? `Tu possèdes ${ing.have}` : '')}>
      <ItemThumb name={ing.name} size={28} />
      <span style={{ fontSize: 12, color: missing ? '#E87070' : 'var(--bp-text)', whiteSpace: 'nowrap' }}>
        {ing.qty > 1 ? `${ing.qty}× ` : ''}{ing.name}
      </span>
    </div>
  )
}

// Carte d'une recette révélée. `craft` accepte soit { inputs|ingredients, result, effect },
// soit le retour de evaluateCraft (ingredients avec have/ok).
export default function CraftCard({ craft, action, missingName }) {
  const ings = craft.ingredients || craft.inputs || []
  return (
    <div style={{
      background: 'var(--bp-surface)', borderRadius: 10, border: '1px solid var(--bp-border)',
      padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {ings.map((ing, i) => <Ingredient key={i} ing={ing} />)}
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
