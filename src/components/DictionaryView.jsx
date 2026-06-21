import { useState, useEffect, useCallback, useMemo } from 'react'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { useAuth } from '../AuthContext.jsx'
import { Input, TextArea, Btn, SectionHead, EmptyState, Badge } from '../ui/primitives.jsx'
import { Icons } from '../ui/Icons.jsx'
import { useIsMobile } from '../ui/useIsMobile.js'
import { translatePhrase } from '../api/translator.js'

// Couleur / libellé associés à la nature d'un morphème.
const KIND_META = {
  word:    { label: 'Mot',      short: 'mot',      color: '#5BAD6E' },
  prefix:  { label: 'Préfixe',  short: 'préf.',    color: 'var(--bp-accent)' },
  suffix:  { label: 'Suffixe',  short: 'suff.',    color: 'var(--bp-gold)' },
}
const kindColor = (k) => KIND_META[k]?.color || 'var(--bp-text-muted)'

function EntryCard({ entry, onChange, canEdit, showKind }) {
  const [term, setTerm] = useState(entry.term || '')
  const [definition, setDefinition] = useState(entry.definition || '')
  const [kind, setKind] = useState(entry.kind || 'word')
  const [termFocused, setTermFocused] = useState(false)

  const save = useCallback(async (next = {}) => {
    const body = { term, definition, kind, ...next }
    if (
      body.term === (entry.term || '') &&
      body.definition === (entry.definition || '') &&
      body.kind === (entry.kind || 'word')
    ) return
    await api.updateDictionaryEntry(entry.id, body)
    onChange()
  }, [entry.id, entry.term, entry.definition, entry.kind, term, definition, kind, onChange])

  const remove = async () => {
    if (!confirm('Supprimer cette entrée ?')) return
    await api.deleteDictionaryEntry(entry.id)
    onChange()
  }

  const setKindAndSave = (k) => { setKind(k); save({ kind: k }) }

  return (
    <div style={{
      background: 'var(--bp-surface)',
      borderRadius: 10,
      border: '1px solid var(--bp-border)',
      borderLeft: showKind ? `3px solid ${kindColor(kind)}` : '1px solid var(--bp-border)',
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onFocus={() => setTermFocused(true)}
          onBlur={() => { setTermFocused(false); if (canEdit) save() }}
          readOnly={!canEdit}
          placeholder="Terme…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            borderBottom: termFocused ? '1px solid var(--bp-accent)' : '1px solid transparent',
            outline: 'none',
            fontFamily: 'var(--font-heading)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--bp-text)',
            padding: '2px 0',
            cursor: canEdit ? 'text' : 'default',
          }}
        />
        {canEdit && (
          <button
            onClick={remove}
            title="Supprimer"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--bp-text-muted)', display: 'inline-flex',
              alignItems: 'center', padding: 4, borderRadius: 4, flexShrink: 0,
            }}
          >
            <Icons.trash style={{ width: 14, height: 14, color: '#E87070' }} />
          </button>
        )}
      </div>

      {showKind && (
        <div style={{ display: 'flex', gap: 6 }}>
          {['prefix', 'suffix'].map((k) => {
            const active = kind === k
            return (
              <button
                key={k}
                type="button"
                disabled={!canEdit}
                onClick={() => canEdit && setKindAndSave(k)}
                style={{
                  padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 600,
                  cursor: canEdit ? 'pointer' : 'default',
                  fontFamily: 'var(--font-body)',
                  background: active ? kindColor(k) + '22' : 'var(--bp-panel)',
                  color: active ? kindColor(k) : 'var(--bp-text-muted)',
                  border: `1px solid ${active ? kindColor(k) + '66' : 'var(--bp-border)'}`,
                }}
              >
                {KIND_META[k].label}
              </button>
            )
          })}
        </div>
      )}

      <TextArea
        value={definition}
        onChange={(e) => setDefinition(e.target.value)}
        onBlur={canEdit ? () => save() : undefined}
        readOnly={!canEdit}
        rows={3}
        placeholder={showKind ? 'Sens / traduction…' : 'Définition…'}
      />
    </div>
  )
}

// Onglet « Traducteur » : décompose un mot à partir des morphèmes du dictionnaire.
function Translator({ entries, isMobile }) {
  const [text, setText] = useState('')
  const tokens = useMemo(() => translatePhrase(text, entries), [text, entries])
  const counts = useMemo(() => {
    let words = 0, prefixes = 0, suffixes = 0
    for (const e of entries) {
      if (e.kind === 'prefix') prefixes++
      else if (e.kind === 'suffix') suffixes++
      else words++
    }
    return { words, prefixes, suffixes }
  }, [entries])

  const realTokens = tokens.filter((t) => !t.space)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Saisis un mot ou une phrase de la langue du jeu…"
          style={{ fontSize: 16, padding: '10px 12px' }}
          autoFocus
        />
        <div style={{ marginTop: 6, fontSize: 12, color: 'var(--bp-text-muted)' }}>
          Décomposition basée sur ton dictionnaire : {counts.words} mot(s), {counts.prefixes} préfixe(s),{' '}
          {counts.suffixes} suffixe(s).
        </div>
      </div>

      {realTokens.length === 0 ? (
        <EmptyState
          icon={<Icons.book style={{ width: '100%', height: '100%' }} />}
          text="Tape quelque chose pour voir sa décomposition."
        />
      ) : (
        <>
          {/* Traduction reconstituée, en une ligne */}
          <div style={{
            background: 'var(--bp-surface)', border: '1px solid var(--bp-border)',
            borderRadius: 10, padding: '14px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.04em',
              textTransform: 'uppercase', color: 'var(--bp-text-muted)', marginBottom: 6 }}>
              Traduction proposée
            </div>
            <div style={{ fontSize: 16, lineHeight: 1.5, color: 'var(--bp-text)' }}>
              {tokens.map((t, i) => t.space ? (
                <span key={i}>{t.text}</span>
              ) : (
                <span key={i} style={{ color: t.complete ? 'var(--bp-text)' : 'var(--bp-text-dim)' }}>
                  {t.recognized ? t.translation : <em style={{ color: 'var(--bp-text-muted)' }}>{t.text}</em>}
                </span>
              ))}
            </div>
          </div>

          {/* Détail token par token */}
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {realTokens.map((t, i) => (
              <div key={i} style={{
                background: 'var(--bp-surface)', border: '1px solid var(--bp-border)',
                borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {/* le mot, découpé en segments colorés */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'baseline' }}>
                  {t.segments.map((s, j) => (
                    <span key={j} style={{
                      fontFamily: 'var(--font-heading)', fontSize: 17, fontWeight: 700,
                      padding: '1px 6px', borderRadius: 5,
                      background: s.known ? kindColor(s.kind) + '1f' : 'transparent',
                      color: s.known ? kindColor(s.kind) : 'var(--bp-text-muted)',
                      borderBottom: s.known ? 'none' : '2px dotted var(--bp-text-muted)',
                    }}>
                      {s.text}
                    </span>
                  ))}
                  {t.unknown > 0 && (
                    <Badge color="#C85454" style={{ marginLeft: 4 }}>
                      {t.unknown} lettre{t.unknown > 1 ? 's' : ''} inconnue{t.unknown > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>

                {/* le détail de chaque morphème reconnu */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {t.segments.map((s, j) => (
                    <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                      <span style={{
                        flexShrink: 0, width: 52, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '.03em',
                        color: s.known ? kindColor(s.kind) : 'var(--bp-text-muted)',
                      }}>
                        {s.known ? KIND_META[s.kind].short : '?'}
                      </span>
                      <span style={{ fontWeight: 700, color: 'var(--bp-text)' }}>{s.text}</span>
                      <span style={{ color: 'var(--bp-text-muted)' }}>→</span>
                      <span style={{ color: s.known && s.definition ? 'var(--bp-text-dim)' : 'var(--bp-text-muted)' }}>
                        {s.known ? (s.definition || '(sens non renseigné)') : 'inconnu'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const TABS = [
  { id: 'words',     label: 'Mots' },
  { id: 'affixes',   label: 'Préfixes & suffixes' },
  { id: 'translate', label: 'Traducteur' },
]

export default function DictionaryView() {
  const { role } = useAuth()
  const canEdit = role !== 'ro'
  const isMobile = useIsMobile()
  const [entries, setEntries] = useState([])
  const [tab, setTab] = useState('words')
  const [term, setTerm] = useState('')
  const [newKind, setNewKind] = useState('prefix') // pour l'ajout d'affixe
  const [query, setQuery] = useState('')

  const load = useCallback(() => api.listDictionary().then(setEntries), [])
  useEffect(() => { load() }, [load])
  useWs(load, ['dictionary'])

  const add = async (e) => {
    e.preventDefault()
    if (!term.trim()) return
    const kind = tab === 'affixes' ? newKind : 'word'
    await api.createDictionaryEntry({ term: term.trim(), definition: '', kind })
    setTerm('')
    load()
  }

  const isAffixes = tab === 'affixes'
  const q = query.trim().toLowerCase()
  const inThisTab = entries.filter((e) =>
    isAffixes ? (e.kind === 'prefix' || e.kind === 'suffix') : (e.kind || 'word') === 'word'
  )
  const filtered = q
    ? inThisTab.filter((e) =>
        (e.term || '').toLowerCase().includes(q) ||
        (e.definition || '').toLowerCase().includes(q))
    : inThisTab

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: isMobile ? '16px 14px' : '24px 28px', height: '100%', overflow: 'auto' }}>
      <SectionHead title="Dictionnaire" />

      {/* sous-onglets */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {TABS.map((t) => {
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setQuery('') }}
              style={{
                padding: '7px 14px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-body)', cursor: 'pointer',
                background: active ? 'var(--bp-accent)' : 'var(--bp-panel)',
                color: active ? '#fff' : 'var(--bp-text-dim)',
                border: `1px solid ${active ? 'var(--bp-accent)' : 'var(--bp-border)'}`,
                transition: 'all .12s',
              }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'translate' ? (
        <Translator entries={entries} isMobile={isMobile} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
            {canEdit && (
              <form onSubmit={add} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 280, maxWidth: 560, flexWrap: 'wrap' }}>
                {isAffixes && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {['prefix', 'suffix'].map((k) => {
                      const active = newKind === k
                      return (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setNewKind(k)}
                          style={{
                            padding: '7px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            fontFamily: 'var(--font-body)', cursor: 'pointer', whiteSpace: 'nowrap',
                            background: active ? kindColor(k) + '22' : 'var(--bp-panel)',
                            color: active ? kindColor(k) : 'var(--bp-text-muted)',
                            border: `1px solid ${active ? kindColor(k) + '66' : 'var(--bp-border)'}`,
                          }}
                        >
                          {KIND_META[k].label}
                        </button>
                      )
                    })}
                  </div>
                )}
                <Input
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  placeholder={isAffixes ? 'Nouveau préfixe / suffixe…' : 'Nouveau terme…'}
                  style={{ flex: 1, minWidth: 160 }}
                />
                <Btn type="submit" variant="accent" style={{ flexShrink: 0 }}>
                  <Icons.plus style={{ width: 14, height: 14 }} />
                  Ajouter
                </Btn>
              </form>
            )}
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher…"
              style={{ maxWidth: 240 }}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Icons.book style={{ width: '100%', height: '100%' }} />}
              text={q
                ? 'Aucun résultat.'
                : isAffixes ? 'Aucun préfixe ni suffixe enregistré.' : 'Aucune entrée dans le dictionnaire.'}
            />
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12,
            }}>
              {filtered.map((e) => (
                <EntryCard key={e.id} entry={e} onChange={load} canEdit={canEdit} showKind={isAffixes} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
