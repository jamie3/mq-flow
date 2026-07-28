import type { Channel, MqTopology, Queue, Subscription, Topic } from '../types/mq'

export type ObjectKind = 'queue' | 'topic' | 'subscription' | 'channel'

function attrText(attributes?: Record<string, string | number>): string {
  if (!attributes) return ''
  return Object.entries(attributes)
    .map(([k, v]) => `${k} ${v}`)
    .join(' ')
}

function join(parts: (string | number | undefined)[]): string {
  return parts.filter((p) => p !== undefined && p !== '').join(' ').toLowerCase()
}

export function queueHaystack(q: Queue): string {
  return join([
    q.name,
    q.queueManager,
    q.queueType,
    q.targetQueue,
    q.targetQueueManager,
    q.description,
    q.currentDepth,
    q.maxDepth,
    attrText(q.attributes),
  ])
}

export function topicHaystack(t: Topic): string {
  return join([t.name, t.queueManager, t.topicString, t.parentTopic, t.description, attrText(t.attributes)])
}

export function subscriptionHaystack(s: Subscription): string {
  return join([
    s.name,
    s.queueManager,
    s.subscriptionType,
    s.topicName,
    s.topicString,
    s.destinationQueue,
    s.destinationQueueManager,
    s.description,
    attrText(s.attributes),
  ])
}

export function channelHaystack(c: Channel): string {
  return join([c.name, c.queueManager, c.channelType, c.targetQueueManager, c.description, attrText(c.attributes)])
}

function qmHaystack(name: string, description?: string, attributes?: Record<string, string | number>): string {
  return join([name, description, attrText(attributes)])
}

function tokenize(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

function matchesAll(haystack: string, tokens: string[]): boolean {
  return tokens.every((t) => haystack.includes(t))
}

export interface FilterOptions {
  query?: string
  /** Object kinds to include. When omitted, all kinds are included. */
  kinds?: Set<ObjectKind>
}

/**
 * Narrows a topology to the objects matching a free-text query (every whitespace-separated token
 * must appear somewhere in the object's fields or properties) and, optionally, a set of allowed
 * object kinds. A queue manager is kept when it matches directly or has any kept child; when a queue
 * manager matches by its own fields, all of its objects are kept.
 */
export function filterTopology(topology: MqTopology, options: FilterOptions): MqTopology {
  const tokens = tokenize(options.query ?? '')
  const kinds = options.kinds
  // No query and no kind restriction: nothing to filter, keep the topology as-is.
  if (tokens.length === 0 && !kinds) return topology
  const allow = (k: ObjectKind) => !kinds || kinds.has(k)

  const qmMatch = new Map<string, boolean>()
  topology.queueManagers.forEach((qm) =>
    qmMatch.set(qm.name, tokens.length === 0 || matchesAll(qmHaystack(qm.name, qm.description, qm.attributes), tokens)),
  )

  const textMatch = (haystack: string) => tokens.length === 0 || matchesAll(haystack, tokens)

  const queues = allow('queue')
    ? topology.queues.filter((q) => qmMatch.get(q.queueManager) || textMatch(queueHaystack(q)))
    : []
  const topics = allow('topic')
    ? topology.topics.filter((t) => qmMatch.get(t.queueManager) || textMatch(topicHaystack(t)))
    : []
  const subscriptions = allow('subscription')
    ? topology.subscriptions.filter((s) => qmMatch.get(s.queueManager) || textMatch(subscriptionHaystack(s)))
    : []
  const channels = allow('channel')
    ? (topology.channels ?? []).filter((c) => qmMatch.get(c.queueManager) || textMatch(channelHaystack(c)))
    : []

  const keptQmNames = new Set<string>()
  queues.forEach((q) => keptQmNames.add(q.queueManager))
  topics.forEach((t) => keptQmNames.add(t.queueManager))
  subscriptions.forEach((s) => keptQmNames.add(s.queueManager))
  channels.forEach((c) => keptQmNames.add(c.queueManager))
  // Keep a directly-matched queue manager even if it has no (visible) children.
  topology.queueManagers.forEach((qm) => {
    if (tokens.length > 0 && qmMatch.get(qm.name)) keptQmNames.add(qm.name)
  })

  return {
    queueManagers: topology.queueManagers.filter((qm) => keptQmNames.has(qm.name)),
    queues,
    topics,
    subscriptions,
    channels,
  }
}

export function objectCount(topology: MqTopology): number {
  return (
    topology.queues.length +
    topology.topics.length +
    topology.subscriptions.length +
    (topology.channels?.length ?? 0)
  )
}
