import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useReactFlow,
  type NodeMouseHandler,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { MqNode } from './nodes/MqNode'
import { QmGroupNode } from './nodes/QmGroupNode'
import type { MqFlowEdge, MqFlowNode } from '../lib/graphModel'

interface FlowCanvasProps {
  nodes: MqFlowNode[]
  edges: MqFlowEdge[]
  onNodeClick?: (node: MqFlowNode) => void
  onPaneClick?: () => void
  /** When this value changes, the view re-fits to the current nodes (e.g. after filtering). */
  fitSignal?: unknown
  /** Overlay content (e.g. a legend) rendered on top of the canvas. */
  children?: ReactNode
}

/** Re-fits the viewport whenever `signal` changes (skipping the very first render). */
function FitOnSignal({ signal }: { signal: unknown }) {
  const { fitView } = useReactFlow()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const id = requestAnimationFrame(() => fitView({ padding: 0.15, duration: 300 }))
    return () => cancelAnimationFrame(id)
  }, [signal, fitView])
  return null
}

export function FlowCanvas({ nodes, edges, onNodeClick, onPaneClick, fitSignal, children }: FlowCanvasProps) {
  const nodeTypes = useMemo(() => ({ mqNode: MqNode, qmGroup: QmGroupNode }), [])

  const handleNodeClick: NodeMouseHandler<MqFlowNode> = (_event, node) => {
    onNodeClick?.(node)
  }

  return (
    <div className="relative h-full w-full">
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
        {fitSignal !== undefined && <FitOnSignal signal={fitSignal} />}
      </ReactFlow>
      {children}
    </div>
  )
}
