import { MarkerType } from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import type { MqTopology } from '../types/mq'

export type MqNodeKind = 'queueManager' | 'queue' | 'topic' | 'subscription'

export type MqRelationship = 'alias' | 'remote' | 'topicHierarchy' | 'subscribes' | 'delivers' | 'channel'

export interface MqNodeData extends Record<string, unknown> {
  label: string
  kind: MqNodeKind
  queueManager: string
  /** The object's own name (equal to queueManager for queue-manager nodes). */
  name: string
  subtype?: string
  description?: string
  attributes?: Record<string, string | number>
  /** True when the object is referenced by a relationship but absent from the export. */
  virtual?: boolean
  /** True for the focal object on a focused (single-object) flow. */
  isRoot?: boolean
}

export interface MqEdgeData extends Record<string, unknown> {
  relationship: MqRelationship
}

export type MqFlowNode = Node<MqNodeData>
export type MqFlowEdge = Edge<MqEdgeData>

/** A normalized object in the topology graph, independent of any layout. */
export interface MqObject {
  id: string
  kind: MqNodeKind
  queueManager: string
  name: string
  virtual: boolean
  data: MqNodeData
}

/** A directed relationship between two objects, independent of any layout. */
export interface MqLink {
  id: string
  source: string
  target: string
  relationship: MqRelationship
  label: string
}

export interface DerivedGraph {
  objects: MqObject[]
  byId: Map<string, MqObject>
  links: MqLink[]
}

export const EDGE_LABELS: Record<MqRelationship, string> = {
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

export function qmNodeId(qm: string) {
  return `qm::${qm}`
}
export function queueNodeId(qm: string, name: string) {
  return `queue::${qm}::${name}`
}
export function topicNodeId(qm: string, name: string) {
  return `topic::${qm}::${name}`
}
export function subNodeId(qm: string, name: string) {
  return `sub::${qm}::${name}`
}
function virtualTopicNodeId(qm: string, ref: string) {
  return `vtopic::${qm}::${ref}`
}
function virtualQueueNodeId(qm: string, ref: string) {
  return `vqueue::${qm}::${ref}`
}

/** The graph node id for a real object identified by (kind, queueManager, name). */
export function objectNodeId(kind: MqNodeKind, queueManager: string, name: string): string {
  switch (kind) {
    case 'queueManager':
      return qmNodeId(name)
    case 'queue':
      return queueNodeId(queueManager, name)
    case 'topic':
      return topicNodeId(queueManager, name)
    case 'subscription':
      return subNodeId(queueManager, name)
  }
}

export function mkFlowEdge(link: MqLink): MqFlowEdge {
  const color = EDGE_COLORS[link.relationship]
  return {
    id: link.id,
    source: link.source,
    target: link.target,
    type: 'smoothstep',
    label: link.label,
    data: { relationship: link.relationship },
    style: {
      stroke: color,
      strokeWidth: 1.5,
      strokeDasharray: link.relationship === 'channel' || link.relationship === 'remote' ? '6 4' : undefined,
    },
    labelStyle: { fill: color, fontSize: 11, fontWeight: 600 },
    labelBgStyle: { fill: '#ffffff', fillOpacity: 0.85 },
    markerEnd: { type: MarkerType.ArrowClosed, color, width: 16, height: 16 },
  }
}

function linkId(relationship: MqRelationship, source: string, target: string): string {
  return `${relationship}::${source}->${target}`
}

/**
 * Turns a topology into a flat set of objects and directed relationships. Layout-specific
 * builders (full overview, focused single-object view) both consume this so node ids and
 * relationships stay identical across every view.
 */
export function deriveGraph(topology: MqTopology): DerivedGraph {
  const objects: MqObject[] = []
  const byId = new Map<string, MqObject>()

  const addObject = (obj: MqObject) => {
    if (byId.has(obj.id)) return byId.get(obj.id)!
    byId.set(obj.id, obj)
    objects.push(obj)
    return obj
  }

  const queueByKey = new Map<string, boolean>()
  topology.queues.forEach((q) => queueByKey.set(`${q.queueManager}::${q.name}`, true))
  const topicByKey = new Map<string, boolean>()
  topology.topics.forEach((t) => topicByKey.set(`${t.queueManager}::${t.name}`, true))
  const knownQmNames = new Set(topology.queueManagers.map((qm) => qm.name))

  for (const qm of topology.queueManagers) {
    addObject({
      id: qmNodeId(qm.name),
      kind: 'queueManager',
      queueManager: qm.name,
      name: qm.name,
      virtual: false,
      data: {
        label: qm.name,
        kind: 'queueManager',
        queueManager: qm.name,
        name: qm.name,
        description: qm.description,
        attributes: qm.attributes,
      },
    })
  }

  for (const t of topology.topics) {
    addObject({
      id: topicNodeId(t.queueManager, t.name),
      kind: 'topic',
      queueManager: t.queueManager,
      name: t.name,
      virtual: false,
      data: {
        label: t.name,
        kind: 'topic',
        queueManager: t.queueManager,
        name: t.name,
        subtype: t.topicString,
        description: t.description,
        attributes: t.attributes,
      },
    })
  }

  for (const q of topology.queues) {
    addObject({
      id: queueNodeId(q.queueManager, q.name),
      kind: 'queue',
      queueManager: q.queueManager,
      name: q.name,
      virtual: false,
      data: {
        label: q.name,
        kind: 'queue',
        queueManager: q.queueManager,
        name: q.name,
        subtype: q.queueType,
        description: q.description,
        attributes: {
          ...q.attributes,
          ...(q.maxDepth !== undefined ? { maxDepth: q.maxDepth } : {}),
          ...(q.currentDepth !== undefined ? { currentDepth: q.currentDepth } : {}),
        },
      },
    })
  }

  for (const s of topology.subscriptions) {
    addObject({
      id: subNodeId(s.queueManager, s.name),
      kind: 'subscription',
      queueManager: s.queueManager,
      name: s.name,
      virtual: false,
      data: {
        label: s.name,
        kind: 'subscription',
        queueManager: s.queueManager,
        name: s.name,
        subtype: s.subscriptionType,
        description: s.description,
        attributes: s.attributes,
      },
    })
  }

  const links: MqLink[] = []
  const addLink = (source: string, target: string, relationship: MqRelationship, label?: string) => {
    const id = linkId(relationship, source, target)
    links.push({ id, source, target, relationship, label: label ?? EDGE_LABELS[relationship] })
  }

  const addVirtualTopic = (qm: string, ref: string, description?: string) => {
    const id = virtualTopicNodeId(qm, ref)
    addObject({
      id,
      kind: 'topic',
      queueManager: qm,
      name: ref,
      virtual: true,
      data: { label: ref, kind: 'topic', queueManager: qm, name: ref, virtual: true, description },
    })
    return id
  }
  const addVirtualQueue = (qm: string, ref: string) => {
    const id = virtualQueueNodeId(qm, ref)
    addObject({
      id,
      kind: 'queue',
      queueManager: qm,
      name: ref,
      virtual: true,
      data: { label: ref, kind: 'queue', queueManager: qm, name: ref, virtual: true },
    })
    return id
  }

  // Topic hierarchy (parent -> child).
  for (const t of topology.topics) {
    if (t.parentTopic && topicByKey.has(`${t.queueManager}::${t.parentTopic}`)) {
      addLink(topicNodeId(t.queueManager, t.parentTopic), topicNodeId(t.queueManager, t.name), 'topicHierarchy')
    }
  }

  // Alias queue -> base queue (same queue manager).
  for (const q of topology.queues) {
    if (q.queueType === 'alias' && q.targetQueue && queueByKey.has(`${q.queueManager}::${q.targetQueue}`)) {
      addLink(queueNodeId(q.queueManager, q.name), queueNodeId(q.queueManager, q.targetQueue), 'alias')
    }
  }

  // Remote queue -> target queue (or target queue manager) on another queue manager.
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
    if (tgt) addLink(src, tgt, 'remote', `remote: ${q.targetQueue ?? '?'}`)
  }

  // Subscriptions -> topic they subscribe to, and -> destination queue they deliver to.
  for (const s of topology.subscriptions) {
    const subId = subNodeId(s.queueManager, s.name)

    if (s.topicName) {
      const key = `${s.queueManager}::${s.topicName}`
      const tgt = topicByKey.has(key) ? topicNodeId(s.queueManager, s.topicName) : addVirtualTopic(s.queueManager, s.topicName)
      addLink(subId, tgt, 'subscribes')
    } else if (s.topicString) {
      const tgt = addVirtualTopic(s.queueManager, s.topicString, 'Topic string referenced directly (no topic object found)')
      addLink(subId, tgt, 'subscribes')
    }

    if (s.destinationQueue && (!s.destinationQueueManager || s.destinationQueueManager === s.queueManager)) {
      const key = `${s.queueManager}::${s.destinationQueue}`
      const tgt = queueByKey.has(key)
        ? queueNodeId(s.queueManager, s.destinationQueue)
        : addVirtualQueue(s.queueManager, s.destinationQueue)
      addLink(subId, tgt, 'delivers')
    }
  }

  // Sender/receiver channels between queue managers.
  for (const c of topology.channels ?? []) {
    if (!c.targetQueueManager || !knownQmNames.has(c.targetQueueManager) || !knownQmNames.has(c.queueManager)) continue
    addLink(qmNodeId(c.queueManager), qmNodeId(c.targetQueueManager), 'channel', c.name)
  }

  return { objects, byId, links }
}
