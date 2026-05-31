import { useState, forwardRef } from 'react'
import { Icons } from './Icons.jsx'

export const ROOM_TYPES_META = [
  { id: 1, name: 'Blueprints',   color: '#4B7FBF' },
  { id: 2, name: 'Bedrooms',     color: '#9B72CF' },
  { id: 3, name: 'Hallways',     color: '#E8913A' },
  { id: 4, name: 'Green rooms',  color: '#5BAD6E' },
  { id: 5, name: 'Shops',        color: '#D4A843' },
  { id: 6, name: 'Red rooms',    color: '#C85454' },
  { id: 7, name: 'Secret rooms', color: '#6B7280' },
]

export function typeColor(typeName, types) {
  const fromApi = types?.find(t => t.name === typeName)
  if (fromApi?.color) return fromApi.color
  return ROOM_TYPES_META.find(t => t.name === typeName)?.color || '#7A9BAE'
}

export const CODE_STATUSES = {
  pending:   { label: 'En attente', color: '#D4A843' },
  tried:     { label: 'Testé',      color: '#5B8EC9' },
  confirmed: { label: 'Confirmé',   color: '#5BAD6E' },
  rejected:  { label: 'Rejeté',     color: '#C85454' },
}

export function Badge({ children, color, style: sx, ...rest }) {
  return <span style={{
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
    background: color ? color + '22' : 'var(--bp-panel)',
    color: color || 'var(--bp-text-dim)',
    border: `1px solid ${color ? color + '44' : 'var(--bp-border)'}`,
    whiteSpace: 'nowrap', ...sx,
  }} {...rest}>{children}</span>
}

export function Btn({ children, variant = 'default', small, style: sx, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: small ? '4px 10px' : '7px 14px',
    borderRadius: 6, fontSize: small ? 12 : 13, fontWeight: 500,
    fontFamily: 'var(--font-body)', cursor: 'pointer',
    border: '1px solid transparent', transition: 'all .15s',
  }
  const vars = {
    default: { background: 'var(--bp-panel)', color: 'var(--bp-text)', borderColor: 'var(--bp-border)' },
    accent:  { background: 'var(--bp-accent)', color: '#fff', borderColor: 'var(--bp-accent)' },
    gold:    { background: 'var(--bp-gold)', color: '#1a1000', borderColor: 'var(--bp-gold)' },
    ghost:   { background: 'transparent', color: 'var(--bp-text-dim)', borderColor: 'transparent' },
    danger:  { background: '#C8545422', color: '#E87070', borderColor: '#C8545444' },
  }
  return <button style={{ ...base, ...(vars[variant] || vars.default), ...sx }} {...rest}>{children}</button>
}

export const Input = forwardRef(function Input({ style: sx, ...rest }, ref) {
  return <input ref={ref} style={{
    width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 13,
    fontFamily: 'var(--font-body)',
    background: 'var(--bp-bg)', color: 'var(--bp-text)',
    border: '1px solid var(--bp-border)', outline: 'none', ...sx,
  }} {...rest} />
})

export function TextArea({ style: sx, ...rest }) {
  return <textarea style={{
    width: '100%', padding: '8px 10px', borderRadius: 6, fontSize: 13,
    fontFamily: 'var(--font-body)', resize: 'vertical',
    background: 'var(--bp-bg)', color: 'var(--bp-text)',
    border: '1px solid var(--bp-border)', outline: 'none', ...sx,
  }} {...rest} />
}

export function Select({ style: sx, children, ...rest }) {
  return <select style={{
    width: '100%', padding: '7px 10px', borderRadius: 6, fontSize: 13,
    fontFamily: 'var(--font-body)',
    background: 'var(--bp-bg)', color: 'var(--bp-text)',
    border: '1px solid var(--bp-border)', outline: 'none', ...sx,
  }} {...rest}>{children}</select>
}

export function EmptyState({ icon, text }) {
  return <div style={{
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    gap: 12, padding: 40, color: 'var(--bp-text-muted)', fontSize: 14,
  }}>
    {icon && <div style={{ width: 32, height: 32, opacity: .5 }}>{icon}</div>}
    <span>{text}</span>
  </div>
}

export const CHESS_SYMBOLS = {
  pawn: '♟', knight: '♞', bishop: '♝', rook: '♜', queen: '♛', king: '♚',
}

export const CHESS_LABELS = {
  king: 'Roi', queen: 'Dame', rook: 'Tour',
  bishop: 'Fou', knight: 'Cavalier', pawn: 'Pion',
}

const CHESS_PIECES_LIST = [
  { key: '', label: 'Aucune' },
  { key: 'king',   symbol: '♚' },
  { key: 'queen',  symbol: '♛' },
  { key: 'rook',   symbol: '♜' },
  { key: 'bishop', symbol: '♝' },
  { key: 'knight', symbol: '♞' },
  { key: 'pawn',   symbol: '♟' },
]

// Reverse-map a displayed symbol back to its French name, for tooltips.
export function chessLabel(chess_pieces) {
  if (!chess_pieces) return null
  if (CHESS_LABELS[chess_pieces]) return CHESS_LABELS[chess_pieces]
  const sym = chessSymbol(chess_pieces)
  for (const [k, v] of Object.entries(CHESS_SYMBOLS)) {
    if (v === sym) return CHESS_LABELS[k]
  }
  return chess_pieces
}

export function chessSymbol(chess_pieces) {
  if (!chess_pieces) return null
  if (CHESS_SYMBOLS[chess_pieces]) return CHESS_SYMBOLS[chess_pieces]
  // backward compat: old free-text values like "Pion", "Tour"
  const lower = chess_pieces.toLowerCase()
  for (const [k, v] of Object.entries(CHESS_SYMBOLS)) {
    if (lower.includes(k)) return v
  }
  const map = { pion: '♟', tour: '♜', fou: '♝', cavalier: '♞', dame: '♛', roi: '♚' }
  for (const [k, v] of Object.entries(map)) {
    if (lower.includes(k)) return v
  }
  return chess_pieces.length <= 2 ? chess_pieces : '♟'
}

export function ChessPieceSelector({ value, onChange }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {CHESS_PIECES_LIST.map(({ key, label, symbol }) => {
        const active = value === key
        return (
          <button
            key={key}
            type="button"
            title={key ? CHESS_LABELS[key] : 'Aucune'}
            onClick={() => onChange(key)}
            style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: key === '' ? 'auto' : 40, height: 40,
              padding: key === '' ? '0 10px' : 0,
              borderRadius: 8, fontSize: key === '' ? 12 : 20,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              background: active ? 'var(--bp-accent)22' : 'var(--bp-panel)',
              border: active ? '2px solid var(--bp-accent)' : '1px solid var(--bp-border)',
              color: active ? 'var(--bp-accent)' : 'var(--bp-text-dim)',
              transition: 'all .12s',
            }}
          >
            {label || symbol}
          </button>
        )
      })}
    </div>
  )
}

export function SectionHead({ title, children, style: sx }) {
  return <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 16, ...sx,
  }}>
    <h2 style={{
      fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 600,
      color: 'var(--bp-text)', margin: 0, letterSpacing: '-0.01em',
    }}>{title}</h2>
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>{children}</div>
  </div>
}
