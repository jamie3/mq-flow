import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlowCanvas } from '../components/FlowCanvas'
import { Legend } from '../components/Legend'
import { OverviewFilterBar } from '../components/OverviewFilterBar'
import { Sidebar } from '../components/Sidebar'
import { buildFullGraph } from '../lib/buildFullGraph'
import { objectPath } from '../lib/categories'
import { filterTopology, objectCount, type ObjectKind } from '../lib/filterTopology'
import type { MqFlowNode, MqNodeKind } from '../lib/graphModel'
import { useTopology } from '../state/TopologyContext'

const KIND_SLUG: Record<MqNodeKind, string> = {
  queueManager: 'queue-manager',
  queue: 'queue',
  topic: 'topic',
  subscription: 'subscription',
}

export function OverviewPage() {
  const { topology } = useTopology()
  const navigate = useNavigate()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [hidden, setHidden] = useState<Set<ObjectKind>>(new Set())

  const toggleKind = (kind: ObjectKind) =>
    setHidden((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })

  const filtered = useMemo(
    () => filterTopology(topology, { query, kinds: hidden.size ? kindsAllowed(hidden) : undefined }),
    [topology, query, hidden],
  )

  const { nodes, edges } = useMemo(() => buildFullGraph(filtered), [filtered])
  const selectedNode = useMemo<MqFlowNode | null>(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const hiddenKey = [...hidden].sort().join(',')
  const total = objectCount(topology)
  const shown = objectCount(filtered)
  const hasTopology = topology.queueManagers.length > 0
  const isFiltering = query.trim() !== '' || hidden.size > 0

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        {!hasTopology ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
            No topology loaded. Use “Load export…” to open an MQ Explorer export, or “Load sample data”.
          </div>
        ) : (
          <>
            <FlowCanvas
              nodes={nodes}
              edges={edges}
              fitSignal={`${query}|${hiddenKey}`}
              onNodeClick={(node) => setSelectedId(node.id)}
              onPaneClick={() => setSelectedId(null)}
            >
              <OverviewFilterBar
                query={query}
                onQueryChange={setQuery}
                hidden={hidden}
                onToggleKind={toggleKind}
                shown={shown}
                total={total}
              />
              <Legend />
            </FlowCanvas>
            {nodes.length === 0 && isFiltering && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="rounded-md bg-white/90 px-4 py-2 text-sm text-slate-500 shadow-sm">
                  No objects match your filter.
                </span>
              </div>
            )}
          </>
        )}
      </div>
      <Sidebar
        node={selectedNode}
        onClose={() => setSelectedId(null)}
        onExplore={
          selectedNode && !selectedNode.data.virtual
            ? () =>
                navigate(
                  objectPath(
                    KIND_SLUG[selectedNode.data.kind],
                    selectedNode.data.queueManager,
                    selectedNode.data.name,
                  ),
                )
            : undefined
        }
      />
    </div>
  )
}

/** Converts the set of hidden kinds into the set of allowed kinds for filterTopology. */
function kindsAllowed(hidden: Set<ObjectKind>): Set<ObjectKind> {
  const all: ObjectKind[] = ['queue', 'topic', 'subscription', 'channel']
  return new Set(all.filter((k) => !hidden.has(k)))
}
