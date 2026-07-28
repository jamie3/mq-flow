import dagre from '@dagrejs/dagre'
import { MarkerType } from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import type { MqTopology, Queue, Topic } from '../types/mq'

export type MqNodeKind = 'queueManager' | 'queue' | 'topic' | 'subscription'

export type MqRelationship = 'alias' | 'remote' | 'topicHierarchy' | 'subscribes' | 'delivers' | 'channel'

export interface MqNodeData extends Record<string, unknown> {
  label: string
  kind: MqNodeKind
  queueManager: string
  subtype?: string
  description?: string
  attributes?: Record<string, string | number>
  virtual?: boolean
}

export interface MqEdgeData extends Record<string, unknown> {
  relationship: MqRelationship
}

export type MqFlowNode = Node<MqNodeData>
export type MqFlowEdge = Edge<MqEdgeData>

const NODE_WIDTH = 200
const NODE_HEIGHT = 60
const GROUP_PADDING_TOP = 60
const GROUP_PADDING = 40
const GROUP_GAP = 100

const EDGE_LABELS: Record<MqRelationship, string> = {
  alias: 'alias of',
  remote: 'remote to',
  topicHierarchy: 'child topic',
  subscribes: 'subscribes to',
  delivers: 'delivers to',
  channel: 'channel',
}

export const EDGE_COLORS: Record<MqRelationship, string> = {
  alias: '#8b5cf6',
  remote: '#f59e0b',
  topicHierarchy: '#64748b',
  subscribes: '#3b82f6',
  delivers: '#10b981',
  channel: '#f43f5e',
}

function qmNodeId(qm: string) {
  return `qm::${qm}`
}
function queueNodeId(qm: string, name: string) {
  return `queue::${qm}::${name}`
}
function topicNodeId(qm: string, name: string) {
  return `topic::${qm}::${name}`
}
function subNodeId(qm: string, name: string) {
  return `sub::${qm}::${name}`
}
function virtualTopicNodeId(qm: string, ref: string) {
  return `vtopic::${qm}::${ref}`
}
function virtualQueueNodeId(qm: string, ref: string) {
  return `vqueue::${qm}::${ref}`
}

function mkEdge(source: string, target: string, relationship: MqRelationship, label?: string): MqFlowEdge {
  const color = EDGE_COLORS[relationship]
  return {
    id: `${relationship}::${source}->${target}`,
    source,
    target,
    type: 'smoothstep',
    label: label ?? EDGE_LABELS[relationship],
    data: { relationship },
    style: {
      stroke: color,
      strokeWidth: 1.5,
      strokeDasharray: relationship === 'channel' || relationship === 'remote' ? '6 4' : undefined,
    },
    labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  }
}

export function buildGraph(topology: MqTopology): { nodes: MqFlowNode[]; edges: MqFlowEdge[] } {
  const nodes: MqFlowNode[] = []
  const edges: MqFlowEdge[] = []

  const queueByKey = new Map<string, Queue>()
  topology.queues.forEach((q) => queueByKey.set(`${q.queueManager}::${q.name}`, q))
  const topicByKey = new Map<string, Topic>()
  topology.topics.forEach((t) => topicByKey.set(`${t.queueManager}::${t.name}`, t))

  let groupX = 0

  for (const qm of topology.queueManagers) {
    const qmId = qmNodeId(qm.name)
    const childNodes: MqFlowNode[] = []
    const childEdges: MqFlowEdge[] = []
    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 })
    g.setDefaultEdgeLabel(() => ({}))

    const seenChildIds = new Set<string>()
    const addChild = (id: string, data: MqNodeData) => {
      if (seenChildIds.has(id)) return
      seenChildIds.add(id)
      childNodes.push({
        id,
        type: 'mqNode',
        data,
        position: { x: 0, y: 0 },
        parentId: qmId,
        extent: 'parent',
      })
      g.setNode(id, { width: NODE_WIDTH, height: NODE_HEIGHT })
    }

    const qmTopics = topology.topics.filter((t) => t.queueManager === qm.name)
    for (const t of qmTopics) {
      addChild(topicNodeId(qm.name, t.name), {
        label: t.name,
        kind: 'topic',
        queueManager: qm.name,
        subtype: t.topicString,
        description: t.description,
        attributes: t.attributes,
      })
    }
    for (const t of qmTopics) {
      if (t.parentTopic && topicByKey.has(`${qm.name}::${t.parentTopic}`)) {
        const src = topicNodeId(qm.name, t.parentTopic)
        const tgt = topicNodeId(qm.name, t.name)
        g.setEdge(src, tgt)
        childEdges.push(mkEdge(src, tgt, 'topicHierarchy'))
      }
    }

    const qmQueues = topology.queues.filter((q) => q.queueManager === qm.name)
    for (const q of qmQueues) {
      addChild(queueNodeId(qm.name, q.name), {
        label: q.name,
        kind: 'queue',
        queueManager: qm.name,
        subtype: q.queueType,
        description: q.description,
        attributes: {
          ...q.attributes,
          ...(q.maxDepth !== undefined ? { maxDepth: q.maxDepth } : {}),
          ...(q.currentDepth !== undefined ? { currentDepth: q.currentDepth } : {}),
        },
      })
    }
    for (const q of qmQueues) {
      if (q.queueType === 'alias' && q.targetQueue && queueByKey.has(`${qm.name}::${q.targetQueue}`)) {
        const src = queueNodeId(qm.name, q.name)
        const tgt = queueNodeId(qm.name, q.targetQueue)
        g.setEdge(src, tgt)
        childEdges.push(mkEdge(src, tgt, 'alias'))
      }
    }

    const qmSubs = topology.subscriptions.filter((s) => s.queueManager === qm.name)
    for (const s of qmSubs) {
      addChild(subNodeId(qm.name, s.name), {
        label: s.name,
        kind: 'subscription',
        queueManager: qm.name,
        subtype: s.subscriptionType,
        description: s.description,
        attributes: s.attributes,
      })
    }
    for (const s of qmSubs) {
      const subId = subNodeId(qm.name, s.name)

      if (s.topicName) {
        const key = `${qm.name}::${s.topicName}`
        const tgt = topicByKey.has(key)
          ? topicNodeId(qm.name, s.topicName)
          : virtualTopicNodeId(qm.name, s.topicName)
        if (!topicByKey.has(key)) {
          addChild(tgt, { label: s.topicName, kind: 'topic', queueManager: qm.name, virtual: true })
        }
        g.setEdge(subId, tgt)
        childEdges.push(mkEdge(subId, tgt, 'subscribes'))
      } else if (s.topicString) {
        const tgt = virtualTopicNodeId(qm.name, s.topicString)
        addChild(tgt, {
          label: s.topicString,
          kind: 'topic',
          queueManager: qm.name,
          virtual: true,
          description: 'Topic string referenced directly (no topic object found)',
        })
        g.setEdge(subId, tgt)
        childEdges.push(mkEdge(subId, tgt, 'subscribes'))
      }

      if (s.destinationQueue && (!s.destinationQueueManager || s.destinationQueueManager === qm.name)) {
        const key = `${qm.name}::${s.destinationQueue}`
        const tgt = queueByKey.has(key)
          ? queueNodeId(qm.name, s.destinationQueue)
          : virtualQueueNodeId(qm.name, s.destinationQueue)
        if (!queueByKey.has(key)) {
          addChild(tgt, { label: s.destinationQueue, kind: 'queue', queueManager: qm.name, virtual: true })
        }
        g.setEdge(subId, tgt)
        childEdges.push(mkEdge(subId, tgt, 'delivers'))
      }
    }

    dagre.layout(g)

    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    childNodes.forEach((n) => {
      const pos = g.node(n.id)
      n.position = { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 }
      minX = Math.min(minX, n.position.x)
      minY = Math.min(minY, n.position.y)
      maxX = Math.max(maxX, n.position.x + NODE_WIDTH)
      maxY = Math.max(maxY, n.position.y + NODE_HEIGHT)
    })
    if (!Number.isFinite(minX)) {
      minX = 0
      minY = 0
      maxX = NODE_WIDTH
      maxY = NODE_HEIGHT
    }

    const offsetX = GROUP_PADDING - minX
    const offsetY = GROUP_PADDING_TOP - minY
    childNodes.forEach((n) => {
      n.position = { x: n.position.x + offsetX, y: n.position.y + offsetY }
    })

    const groupWidth = maxX - minX + GROUP_PADDING * 2
    const groupHeight = maxY - minY + GROUP_PADDING_TOP + GROUP_PADDING

    nodes.push({
      id: qmId,
      type: 'qmGroup',
      data: {
        label: qm.name,
        kind: 'queueManager',
        queueManager: qm.name,
        description: qm.description,
        attributes: qm.attributes,
      },
      position: { x: groupX, y: 0 },
      style: { width: groupWidth, height: groupHeight },
      selectable: true,
    })
    childNodes.forEach((n) => nodes.push(n))
    edges.push(...childEdges)

    groupX += groupWidth + GROUP_GAP
  }

  const knownQmNames = new Set(topology.queueManagers.map((qm) => qm.name))
  for (const q of topology.queues) {
    if (q.queueType !== 'remote' || !q.targetQueueManager) continue
    const src = queueNodeId(q.queueManager, q.name)
    const targetQmKnown = knownQmNames.has(q.targetQueueManager)
    let tgt: string | null = null
    if (q.targetQueue && targetQmKnown && queueByKey.has(`${q.targetQueueManager}::${q.targetQueue}`)) {
      tgt = queueNodeId(q.targetQueueManager, q.targetQueue)
    } else if (targetQmKnown) {
      tgt = qmNodeId(q.targetQueueManager)
    }
    if (tgt) {
      edges.push(mkEdge(src, tgt, 'remote', `remote: ${q.targetQueue ?? '?'}`))
    }
  }

  for (const c of topology.channels ?? []) {
    if (!c.targetQueueManager || !knownQmNames.has(c.targetQueueManager) || !knownQmNames.has(c.queueManager)) continue
    const src = qmNodeId(c.queueManager)
    const tgt = qmNodeId(c.targetQueueManager)
    edges.push(mkEdge(src, tgt, 'channel', c.name))
  }

  return { nodes, edges }
}
