import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlowCanvas } from '../components/FlowCanvas'
import { Legend } from '../components/Legend'
import { Sidebar } from '../components/Sidebar'
import { buildFullGraph } from '../lib/buildFullGraph'
import { CATEGORIES } from '../lib/categories'
import type { MqFlowNode, MqNodeKind } from '../lib/graphModel'
import { objectPath } from '../lib/categories'
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

  const { nodes, edges } = useMemo(() => buildFullGraph(topology), [topology])
  const selectedNode = useMemo<MqFlowNode | null>(
    () => nodes.find((n) => n.id === selectedId) ?? null,
    [nodes, selectedId],
  )

  const isEmpty = CATEGORIES.every((c) => {
    switch (c.kind) {
      case 'queueManager':
        return topology.queueManagers.length === 0
      case 'queue':
        return topology.queues.length === 0
      case 'topic':
        return topology.topics.length === 0
      case 'subscription':
        return topology.subscriptions.length === 0
      default:
        return true
    }
  })

  return (
    <div className="flex h-full">
      <div className="relative min-w-0 flex-1">
        {isEmpty ? (
          <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
            No topology loaded. Use “Load export…” to open an MQ Explorer export, or “Load sample data”.
          </div>
        ) : (
          <FlowCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={(node) => setSelectedId(node.id)}
            onPaneClick={() => setSelectedId(null)}
          >
            <Legend />
          </FlowCanvas>
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
