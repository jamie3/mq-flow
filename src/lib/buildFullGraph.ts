import dagre from '@dagrejs/dagre'
import type { MqTopology } from '../types/mq'
import {
  deriveGraph,
  mkFlowEdge,
  qmNodeId,
  type MqFlowEdge,
  type MqFlowNode,
  type MqLink,
  type MqObject,
} from './graphModel'

const NODE_WIDTH = 200
const NODE_HEIGHT = 60
const GROUP_PADDING_TOP = 60
const GROUP_PADDING = 40
const GROUP_GAP = 100

/**
 * Builds the full-topology overview: every object grouped inside its owning queue-manager
 * container, laid out per group with dagre, plus cross-queue-manager edges (remote, channel).
 */
export function buildFullGraph(topology: MqTopology): { nodes: MqFlowNode[]; edges: MqFlowEdge[] } {
  const { objects, byId, links } = deriveGraph(topology)

  const nodes: MqFlowNode[] = []
  const edges: MqFlowEdge[] = []

  // Group the non-queue-manager objects by their owning queue manager.
  const childrenByQm = new Map<string, MqObject[]>()
  for (const obj of objects) {
    if (obj.kind === 'queueManager') continue
    const list = childrenByQm.get(obj.queueManager) ?? []
    list.push(obj)
    childrenByQm.set(obj.queueManager, list)
  }

  // A link lays out inside a group only when both endpoints are children of the same queue manager.
  const isIntraQm = (link: MqLink): string | null => {
    const s = byId.get(link.source)
    const t = byId.get(link.target)
    if (!s || !t) return null
    if (s.kind === 'queueManager' || t.kind === 'queueManager') return null
    return s.queueManager === t.queueManager ? s.queueManager : null
  }

  const linksByQm = new Map<string, MqLink[]>()
  const topLevelLinks: MqLink[] = []
  for (const link of links) {
    const qm = isIntraQm(link)
    if (qm) {
      const list = linksByQm.get(qm) ?? []
      list.push(link)
      linksByQm.set(qm, list)
    } else {
      topLevelLinks.push(link)
    }
  }

  const qmOrder = objects.filter((o) => o.kind === 'queueManager')
  let groupX = 0

  for (const qm of qmOrder) {
    const qmId = qmNodeId(qm.name)
    const children = childrenByQm.get(qm.name) ?? []
    const intraLinks = linksByQm.get(qm.name) ?? []

    const g = new dagre.graphlib.Graph()
    g.setGraph({ rankdir: 'TB', nodesep: 40, ranksep: 70 })
    g.setDefaultEdgeLabel(() => ({}))

    const childNodes: MqFlowNode[] = children.map((obj) => {
      g.setNode(obj.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
      return {
        id: obj.id,
        type: 'mqNode',
        data: obj.data,
        position: { x: 0, y: 0 },
        parentId: qmId,
        extent: 'parent',
      }
    })
    for (const link of intraLinks) g.setEdge(link.source, link.target)

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
      data: qm.data,
      position: { x: groupX, y: 0 },
      style: { width: groupWidth, height: groupHeight },
      selectable: true,
    })
    childNodes.forEach((n) => nodes.push(n))
    intraLinks.forEach((link) => edges.push(mkFlowEdge(link)))

    groupX += groupWidth + GROUP_GAP
  }

  topLevelLinks.forEach((link) => edges.push(mkFlowEdge(link)))

  return { nodes, edges }
}
