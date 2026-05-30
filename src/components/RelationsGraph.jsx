import { useState, useEffect, useCallback } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'
import { meta, ENTITY_TYPES } from '../api/entities.js'

const STORAGE_KEY = 'bp_relations_positions'
const loadSavedPositions = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') } catch { return {} }
}
const savePositions = (posMap) => localStorage.setItem(STORAGE_KEY, JSON.stringify(posMap))

export default function RelationsGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [stats, setStats] = useState({ total: 0, shown: 0 })

  const load = useCallback(() => {
    api.graph().then(({ nodes, edges }) => {
      const linked = new Set()
      for (const e of edges) {
        linked.add(`${e.from_type}::${e.from_id}`)
        linked.add(`${e.to_type}::${e.to_id}`)
      }
      const filtered = nodes.filter((n) => linked.has(`${n.type}::${n.id}`))

      const saved = loadSavedPositions()
      const cols = {}
      ENTITY_TYPES.forEach((t, i) => (cols[t] = { x: i * 250, count: 0 }))

      const rfNodes = filtered.map((n) => {
        const nid = `${n.type}::${n.id}`
        let position
        if (saved[nid]) {
          position = saved[nid]
        } else {
          const col = cols[n.type] || { x: 0, count: 0 }
          position = { x: col.x, y: col.count * 90 + 50 }
          col.count++
        }
        return {
          id: nid,
          position,
          data: { label: `${meta(n.type).icon} ${n.label}` },
          draggable: true,
          style: {
            background: meta(n.type).color + '22',
            border: `1px solid ${meta(n.type).color}`,
            color: '#e2e8f0',
            borderRadius: 8,
            fontSize: 12,
            width: 210,
          },
        }
      })
      const rfEdges = edges.map((e) => ({
        id: `e${e.id}`,
        source: `${e.from_type}::${e.from_id}`,
        target: `${e.to_type}::${e.to_id}`,
        label: e.label || undefined,
        labelStyle: { fill: '#94a3b8', fontSize: 10 },
        labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
        animated: true,
      }))
      setNodes(rfNodes)
      setEdges(rfEdges)
      setStats({ total: nodes.length, shown: filtered.length })
    })
  }, [setNodes, setEdges])

  useEffect(() => { load() }, [load])
  useWs(load, ['links', 'rooms', 'people', 'codes', 'notes', 'days'])

  const handleNodesChange = (changes) => {
    onNodesChange(changes)
    for (const ch of changes) {
      if (ch.type === 'position' && ch.dragging === false && ch.position) {
        const saved = loadSavedPositions()
        saved[ch.id] = ch.position
        savePositions(saved)
      }
    }
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3 flex-wrap">
        <button onClick={load} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-sm">↻ Rafraîchir</button>
        <div className="flex gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded">
          {ENTITY_TYPES.map((t) => (
            <span key={t} className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta(t).color }} />
              {meta(t).label}
            </span>
          ))}
        </div>
        {stats.total > stats.shown && (
          <span className="text-xs bg-slate-800/80 px-3 py-1.5 rounded text-slate-400">
            {stats.shown} liés / {stats.total - stats.shown} sans lien masqués
          </span>
        )}
      </div>
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={onEdgesChange}
        fitView colorMode="dark">
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
