import { useState, useEffect, useCallback, useRef } from 'react'
import { ReactFlow, Background, Controls, MiniMap, useNodesState, useEdgesState } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api/client.js'
import { useWs } from '../api/useWs.js'

const RELATIONS = ['parent', 'conjoint', 'fratrie', 'autre']
const EDGE_STYLE = {
  parent: { stroke: '#ec4899', strokeWidth: 2 },
  conjoint: { stroke: '#f59e0b', strokeDasharray: '5 5', strokeWidth: 2 },
  fratrie: { stroke: '#10b981', strokeDasharray: '2 4', strokeWidth: 2 },
  autre: { stroke: '#94a3b8', strokeWidth: 1 },
}

const NODE_W = 180
const NODE_H = 100
const NODE_GAP_X = 30
const NODE_GAP_Y = 40

// Layout par graphe : BFS depuis le noeud le plus connecté, niveaux par distance
function graphLayout(people, links) {
  if (!people.length) return {}

  const ids = people.map((p) => p.id)
  const adj = {}
  for (const id of ids) adj[id] = new Set()
  for (const l of links) {
    if (adj[l.from_id]) adj[l.from_id].add(l.to_id)
    if (adj[l.to_id]) adj[l.to_id].add(l.from_id)
  }

  // Composantes connexes
  const visited = new Set()
  const components = []
  for (const id of ids) {
    if (visited.has(id)) continue
    const comp = []
    const queue = [id]
    while (queue.length) {
      const cur = queue.shift()
      if (visited.has(cur)) continue
      visited.add(cur)
      comp.push(cur)
      for (const nb of adj[cur] || []) if (!visited.has(nb)) queue.push(nb)
    }
    components.push(comp)
  }

  // Trier : composantes avec liens d'abord, puis isolés
  components.sort((a, b) => {
    const aLinked = a.some((id) => (adj[id]?.size || 0) > 0)
    const bLinked = b.some((id) => (adj[id]?.size || 0) > 0)
    if (aLinked !== bLinked) return bLinked ? 1 : -1
    return b.length - a.length
  })

  const pos = {}
  let globalOffsetY = 0

  for (const comp of components) {
    if (comp.length === 1 && (adj[comp[0]]?.size || 0) === 0) {
      // Isolé — on empile à la fin
      continue
    }

    // BFS depuis le noeud le plus connecté de la composante
    const start = comp.reduce((best, id) => (adj[id].size > adj[best].size ? id : best), comp[0])
    const level = {}
    const bfsVisited = new Set()
    const queue = [[start, 0]]
    while (queue.length) {
      const [id, lv] = queue.shift()
      if (bfsVisited.has(id)) continue
      bfsVisited.add(id)
      level[id] = lv
      for (const nb of adj[id]) if (!bfsVisited.has(nb)) queue.push([nb, lv + 1])
    }

    // Grouper par niveau
    const byLevel = {}
    for (const id of comp) {
      const lv = level[id] ?? 0
      ;(byLevel[lv] ||= []).push(id)
    }

    // Centrer chaque rangée
    const maxW = Math.max(...Object.values(byLevel).map((a) => a.length))
    const totalW = maxW * (NODE_W + NODE_GAP_X)

    for (const [lv, pids] of Object.entries(byLevel)) {
      const rowW = pids.length * (NODE_W + NODE_GAP_X)
      const startX = (totalW - rowW) / 2
      pids.forEach((id, i) => {
        pos[id] = {
          x: startX + i * (NODE_W + NODE_GAP_X),
          y: globalOffsetY + Number(lv) * (NODE_H + NODE_GAP_Y),
        }
      })
    }

    const maxLevel = Math.max(...Object.values(level))
    globalOffsetY += (maxLevel + 1) * (NODE_H + NODE_GAP_Y) + 60
  }

  // Isolés en grille en dessous
  const isolated = components.filter((c) => c.length === 1 && (adj[c[0]]?.size || 0) === 0).flat()
  const gridCols = 5
  isolated.forEach((id, i) => {
    pos[id] = {
      x: (i % gridCols) * (NODE_W + NODE_GAP_X),
      y: globalOffsetY + Math.floor(i / gridCols) * (NODE_H + NODE_GAP_Y),
    }
  })

  return pos
}

export default function Genealogy() {
  const [people, setPeople] = useState([])
  const [pLinks, setPLinks] = useState([])
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const saveTimer = useRef(null)

  const load = useCallback(async () => {
    const ppl = await api.listPeople()
    const { edges } = await api.graph()
    const links = edges.filter((e) => e.from_type === 'person' && e.to_type === 'person')
    setPeople(ppl)
    setPLinks(links)
  }, [])

  useEffect(() => { load() }, [load])
  useWs(load, ['people', 'links'])

  useEffect(() => {
    // Positions sauvegardées ou layout auto
    const autoPos = graphLayout(people, pLinks)

    setNodes(people.map((p) => {
      const saved = p.tree_x != null && p.tree_y != null
      const position = saved
        ? { x: p.tree_x, y: p.tree_y }
        : autoPos[p.id] || { x: 0, y: 0 }
      return {
        id: String(p.id),
        position,
        data: { label: p.name },
        draggable: true,
        style: {
          background: '#ec489922',
          border: '1px solid #ec4899',
          color: '#e2e8f0',
          borderRadius: 8,
          width: NODE_W,
          textAlign: 'center',
          fontSize: 13,
        },
      }
    }))
    setEdges(pLinks.map((l) => ({
      id: `e${l.id}`,
      source: String(l.from_id),
      target: String(l.to_id),
      label: l.label || undefined,
      style: EDGE_STYLE[l.label] || EDGE_STYLE.autre,
      labelStyle: { fill: '#94a3b8', fontSize: 10 },
      labelBgStyle: { fill: '#1e293b', fillOpacity: 0.8 },
      markerEnd: l.label === 'parent' ? { type: 'arrowclosed' } : undefined,
    })))
  }, [people, pLinks, setNodes, setEdges])

  const onConnect = useCallback(async (params) => {
    const rel = prompt(`Type de relation ?\n(${RELATIONS.join(' / ')})\nNB: pour "parent", la source est le parent de la cible.`, 'parent')
    if (!rel) return
    await api.createLink({ from_type: 'person', from_id: Number(params.source), to_type: 'person', to_id: Number(params.target), label: rel })
    load()
  }, [load])

  // Sauvegarde position au drag
  const handleNodesChange = (changes) => {
    onNodesChange(changes)
    for (const ch of changes) {
      if (ch.type === 'position' && ch.dragging === false && ch.position) {
        api.setPersonPosition(ch.id, { tree_x: ch.position.x, tree_y: ch.position.y })
      }
    }
  }

  const handleEdgesChange = (changes) => {
    onEdgesChange(changes)
    for (const ch of changes) {
      if (ch.type === 'remove') {
        const linkId = ch.id.replace(/^e/, '')
        api.deleteLink(linkId).then(load)
      }
    }
  }

  const resetLayout = async () => {
    const autoPos = graphLayout(people, pLinks)
    const promises = []
    for (const p of people) {
      const pos = autoPos[p.id] || { x: 0, y: 0 }
      promises.push(api.setPersonPosition(p.id, { tree_x: pos.x, tree_y: pos.y }))
    }
    await Promise.all(promises)
    load()
  }

  return (
    <div className="h-full relative">
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 flex-wrap">
        <span className="bg-slate-800/80 px-3 py-1.5 rounded text-sm font-medium">🌳 Arbre généalogique</span>
        <button onClick={resetLayout} className="bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded text-sm">↻ Reset layout</button>
        <div className="flex gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-pink-500 inline-block" /> parent</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-amber-500 inline-block" /> conjoint</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-emerald-500 inline-block" /> fratrie</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-slate-400 inline-block" /> autre</span>
        </div>
        <span className="text-xs text-slate-400 bg-slate-800/80 px-2 py-1.5 rounded">Drag pour placer • Relie pour créer un lien • Suppr pour effacer</span>
      </div>
      {people.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-slate-500 pointer-events-none">
          Ajoute des personnes dans l'onglet 👥 Personnes d'abord.
        </div>
      )}
      <ReactFlow nodes={nodes} edges={edges} onNodesChange={handleNodesChange} onEdgesChange={handleEdgesChange}
        onConnect={onConnect} fitView colorMode="dark">
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  )
}
