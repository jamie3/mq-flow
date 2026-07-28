import dagre from '@dagrejs/dagre'
import type { MqTopology } from '../types/mq'
import {
  deriveGraph,
  mkFlowEdge,
  objectNodeId,
  qmNodeId,
  type MqFlowEdge,
  type MqFlowNode,
  type MqNodeKind,
  type MqObject,
} from './graphModel'

const NODE_WIDTH = 200
const NODE_HEIGHT = 60

export interface FocusTarget {
  kind: MqNodeKind | 'channel'
  queueManager: string
  name: string
}

export interface FocusedGraph {
  nodes: MqFlowNode[]
  edges: MqFlowEdge[]
  found: boolean
  /** The resolved focal object, when it exists in the topology. */
  root?: MqObject
}

function layout(nodes: MqFlowNode[], edges: MqFlowEdge[]): MqFlowNode[] {
  const g = new dagre.graphlib.Graph()
  g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 90, marginx: 20, marginy: 20 })
  g.setDefaultEdgeLabel(() => ({}))
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  return nodes.map((n) => {
    const pos = g.node(n.id)
    return { ...n, position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 } }
  })
}

function toFlowNode(obj: MqObject, isRoot: boolean): MqFlowNode {
  return {
    id: obj.id,
    type: 'mqNode',
    data: { ...obj.data, isRoot },
    position: { x: 0, y: 0 },
  }
}

/**
 * Builds a focused flow centered on a single object: the object plus everything reachable within
 * `depth` relationship hops. Queue managers expand to their whole internal topology; channels show
 * the two queue managers they connect.
 */
export function buildFocusedGraph(topology: MqTopology, target: FocusTarget, depth = 2): FocusedGraph {
  const { objects, byId, links } = deriveGraph(topology)

  // Channels are relationships, not objects — render the two queue managers they join.
  if (target.kind === 'channel') {
    const channel = (topology.channels ?? []).find(
      (c) => c.queueManager === target.queueManager && c.name === target.name,
    )
    if (!channel) return { nodes: [], edges: [], found: false }
    // The channel's edge (with its inferred partner queue manager) is derived once in deriveGraph.
    const link = links.find((l) => l.relationship === 'channel' && l.label === channel.name)
    const srcObj = byId.get(qmNodeId(channel.queueManager))
    const tgtObj = link ? byId.get(link.target) : undefined
    const nodes: MqFlowNode[] = []
    if (srcObj) nodes.push(toFlowNode(srcObj, true))
    if (tgtObj) nodes.push(toFlowNode(tgtObj, false))
    const edges = link ? [mkFlowEdge(link)] : []
    return { nodes: layout(nodes, edges), edges, found: true }
  }

  const rootId = objectNodeId(target.kind, target.queueManager, target.name)
  const root = byId.get(rootId)
  if (!root) return { nodes: [], edges: [], found: false }

  // Undirected adjacency for neighborhood discovery.
  const adjacency = new Map<string, Set<string>>()
  const connect = (a: string, b: string) => {
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }
  links.forEach((l) => connect(l.source, l.target))

  // Seed the frontier. A queue manager has no direct links to its own objects, so seed it with
  // every object it owns to reveal its internal topology.
  const seeds = new Set<string>([rootId])
  if (root.kind === 'queueManager') {
    objects.forEach((o) => {
      if (o.kind !== 'queueManager' && o.queueManager === root.queueManager) seeds.add(o.id)
    })
  }

  const included = new Set<string>(seeds)
  let frontier = new Set<string>(seeds)
  for (let hop = 0; hop < depth; hop++) {
    const next = new Set<string>()
    frontier.forEach((id) => {
      adjacency.get(id)?.forEach((nb) => {
        if (!included.has(nb)) {
          included.add(nb)
          next.add(nb)
        }
      })
    })
    if (next.size === 0) break
    frontier = next
  }

  const nodes: MqFlowNode[] = []
  included.forEach((id) => {
    const obj = byId.get(id)
    if (obj) nodes.push(toFlowNode(obj, id === rootId))
  })

  const edges: MqFlowEdge[] = links
    .filter((l) => included.has(l.source) && included.has(l.target))
    .map((l) => mkFlowEdge(l))

  return { nodes: layout(nodes, edges), edges, found: true, root }
}
