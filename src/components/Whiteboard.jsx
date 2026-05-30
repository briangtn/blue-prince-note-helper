import { useState, useEffect, useCallback, useRef } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, addEdge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api/client.js'

let idSeq = 1
const newId = () => `n_${Date.now()}_${idSeq++}`

export default function Whiteboard() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [loaded, setLoaded] = useState(false)
  const saveTimer = useRef(null)

  // Load board once
  useEffect(() => {
    api.getBoard().then(({ nodes, edges }) => {
      setNodes(nodes.map((n) => ({
        id: n.id,
        position: { x: n.pos_x, y: n.pos_y },
        data: { label: n.label },
        type: 'default',
      })))
      setEdges(edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label })))
      setLoaded(true)
    })
  }, [setNodes, setEdges])

  // Debounced auto-save
  useEffect(() => {
    if (!loaded) return
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.saveBoard({
        nodes: nodes.map((n) => ({
          id: n.id, label: n.data?.label ?? '', type: 'default',
          pos_x: n.position.x, pos_y: n.position.y, data: null,
        })),
        edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target, label: e.label ?? null })),
      })
    }, 500)
    return () => clearTimeout(saveTimer.current)
  }, [nodes, edges, loaded])

  const onConnect = useCallback((params) => {
    const label = prompt('Label du lien (optionnel) :') || ''
    setEdges((eds) => addEdge({ ...params, id: newId(), label }, eds))
  }, [setEdges])

  const addNode = () => {
    const label = prompt('Texte de la note :')
    if (!label) return
    setNodes((nds) => nds.concat({
      id: newId(),
      position: { x: 100 + Math.round((nds.length % 5) * 60), y: 100 + Math.round((nds.length % 5) * 60) },
      data: { label },
      type: 'default',
    }))
  }

  return (
    <div className="h-full relative">
      <button onClick={addNode}
        className="absolute top-4 left-4 z-10 bg-cyan-600 hover:bg-cyan-500 px-4 py-2 rounded font-medium shadow-lg">
        + Note
      </button>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView colorMode="dark"
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
