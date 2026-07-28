import { useMemo } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { MqNode } from './nodes/MqNode'
import { QmGroupNode } from './nodes/QmGroupNode'
import type { MqFlowEdge, MqFlowNode } from '../lib/buildGraph'

interface TopologyViewProps {
  nodes: MqFlowNode[]
  edges: MqFlowEdge[]
  onNodeClick: (node: MqFlowNode) => void
  onPaneClick: () => void
}

export function TopologyView({ nodes, edges, onNodeClick, onPaneClick }: TopologyViewProps) {
  const nodeTypes = useMemo(() => ({ mqNode: MqNode, qmGroup: QmGroupNode }), [])

  const handleNodeClick: NodeMouseHandler<MqFlowNode> = (_event, node) => {
    onNodeClick(node)
  }

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#e2e8f0" />
        <Controls />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => (n.type === 'qmGroup' ? '#cbd5e1' : '#94a3b8')}
          maskColor="rgba(241,245,249,0.7)"
        />
      </ReactFlow>
    </div>
  )
}
