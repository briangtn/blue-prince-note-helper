import { useState, useEffect, useCallback } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { comboLetters, parseCombos, tableauLetter } from '../api/tableaux.js'

const ROWS = 9
const COLS = 5

function cellLabel(r, c) {
  return String.fromCharCode(65 + c) + (r + 1)
}

export default function LettersPlan() {
  const [tableaux, setTableaux] = useState([])

  const load = useCallback(() => api.listTableaux().then(setTableaux), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['tableaux'])

  const at = (r, c) => tableaux.find((t) => t.row === r && t.col === c)
  const filledCount = tableaux.filter((t) => comboLetters(t.combos).length > 0).length

  return (
    <div style={{ padding: '20px 24px', overflow: 'auto', height: '100%' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{
          fontFamily: 'var(--font-heading)', fontSize: 28, fontWeight: 700,
          color: 'var(--bp-text)', margin: 0,
        }}>Plan des lettres</h2>
        <p style={{ color: 'var(--bp-text-muted)', fontSize: 13, marginTop: 4 }}>
          Lettre de différence des combinaisons de tableaux, par position du manoir.
          {' '}{filledCount} position{filledCount !== 1 ? 's' : ''} renseignée{filledCount !== 1 ? 's' : ''}.
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLS}, minmax(90px, 130px))`,
        gap: 7,
        padding: 16,
        borderRadius: 12,
        background: 'var(--bp-surface)',
        border: '1px solid var(--bp-border)',
        width: 'fit-content',
      }}>
        {Array.from({ length: ROWS }).map((_, r) =>
          Array.from({ length: COLS }).map((_, c) => {
            const tb = at(r, c)
            const letters = comboLetters(tb?.combos)
            const pairs = parseCombos(tb?.combos).filter((p) => p[0] || p[1])
            const title = pairs.length
              ? pairs.map((p) => `${p.filter(Boolean).join(' / ')} → ${tableauLetter(p[0], p[1]) || '?'}`).join('\n')
              : undefined

            return (
              <div
                key={`${r}-${c}`}
                title={title}
                style={{
                  aspectRatio: '1.2',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  background: letters.length ? 'var(--bp-panel)' : 'transparent',
                  border: letters.length
                    ? '2px solid var(--bp-gold)'
                    : '1.5px dashed var(--bp-border)',
                }}
              >
                <span style={{
                  position: 'absolute', top: 4, left: 5,
                  fontSize: 9, color: 'var(--bp-text-muted)',
                  fontFamily: 'var(--font-mono)',
                }}>{cellLabel(r, c)}</span>

                {letters.length > 0 ? (
                  <span style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    gap: 2, color: 'var(--bp-gold)', fontWeight: 800, lineHeight: 1,
                    fontSize: letters.length === 1 ? 40 : 24,
                  }}>{letters.map((l, i) => <span key={i}>{l}</span>)}</span>
                ) : (
                  <span style={{ fontSize: 16, color: 'var(--bp-border)' }}>·</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
