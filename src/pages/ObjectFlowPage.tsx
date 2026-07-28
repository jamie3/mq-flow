import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { FlowCanvas } from '../components/FlowCanvas'
import { Legend } from '../components/Legend'
import { Sidebar } from '../components/Sidebar'
import { buildFocusedGraph, type FocusTarget } from '../lib/buildFocusedGraph'
import { CATEGORY_BY_KIND_SLUG, objectPath } from '../lib/categories'
import type { MqFlowNode, MqNodeKind } from '../lib/graphModel'
import { useTopology } from '../state/TopologyContext'

const KIND_SLUG: Record<MqNodeKind, string> = {
  queueManager: 'queue-manager',
  queue: 'queue',
  topic: 'topic',
  subscription: 'subscription',
}

const DEPTHS = [1, 2, 3]

export function ObjectFlowPage() {
  const { kind: kindSlug, qm, name } = useParams<{ kind: string; qm: string; name: string }>()
  const { topology } = useTopology()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [depth, setDepth] = useState(2)

  const category = kindSlug ? CATEGORY_BY_KIND_SLUG.get(kindSlug) : undefined
  const queueManager = qm ? decodeURIComponent(qm) : ''
  const objectName = name ? decodeURIComponent(name) : ''

  const categoryKind = category?.kind
  const { nodes, edges, found } = useMemo(() => {
    if (!categoryKind) return { nodes: [], edges: [], found: false }
    const target: FocusTarget = { kind: categoryKind, queueManager, name: objectName }
    return buildFocusedGraph(topology, target, depth)
  }, [topology, categoryKind, queueManager, objectName, depth])

  // Reset selection when navigating to a different object.
  useEffect(() => setSelectedId(null), [kindSlug, queueManager, objectName])

  const selectedNode = useMemo<MqFlowNode | null>(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  if (!category) {
    return <div className="p-8 text-sm text-slate-500">Unknown object type.</div>
  }

  const handleNodeClick = (node: MqFlowNode) => {
    setSelectedId(node.id)
    // Clicking a different, real object re-centers the flow on it (walk the graph).
    if (!node.data.isRoot && !node.data.virtual) {
      navigate(objectPath(KIND_SLUG[node.data.kind], node.data.queueManager, node.data.name))
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-3">
        <Link to={`/list/${category.slug}`} className="text-xs text-indigo-600 hover:underline">
          ← {category.label}
        </Link>
        <div>
          <h2 className="text-base font-semibold text-slate-800">{objectName}</h2>
          <p className="text-xs text-slate-500">
            {category.singular}
            {category.kind !== 'queueManager' && ` on ${queueManager}`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-slate-500">Depth</span>
          <div className="flex overflow-hidden rounded-md border border-slate-300">
            {DEPTHS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepth(d)}
                className={`px-2.5 py-1 text-xs font-medium ${
                  depth === d ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="relative min-w-0 flex-1">
          {!found ? (
            <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
              “{objectName}” was not found in the loaded topology.
            </div>
          ) : (
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onPaneClick={() => setSelectedId(null)}
            >
              <Legend />
            </FlowCanvas>
          )}
        </div>
        <Sidebar node={selectedNode} onClose={() => setSelectedId(null)} />
      </div>
    </div>
  )
}
