import Papa from 'papaparse'
import type {
  Channel,
  MqTopology,
  Queue,
  QueueManager,
  QueueType,
  Subscription,
  SubscriptionType,
  Topic,
} from '../types/mq'
import { emptyTopology } from '../types/mq'

export class MqParseError extends Error {}

/**
 * Column-name aliases for CSV exports. MQ Explorer's own "export" dialogs vary by version and by
 * which object list is selected, so this maps the common header variants (case/space-insensitive)
 * onto our canonical field names. Extend this if your export uses different headers.
 */
const COLUMN_ALIASES: Record<string, string> = {
  objecttype: 'objectType',
  type: 'objectType',
  class: 'objectType',

  name: 'name',
  queuename: 'name',
  topicname: 'name',
  subscriptionname: 'name',
  channelname: 'name',

  queuemanager: 'queueManager',
  qmgr: 'queueManager',
  qmname: 'queueManager',

  queuetype: 'queueType',
  usage: 'queueType',

  targetqueue: 'targetQueue',
  target: 'targetQueue',
  rname: 'targetQueue',

  targetqueuemanager: 'targetQueueManager',
  rqmname: 'targetQueueManager',
  remotequeuemanager: 'targetQueueManager',

  maxdepth: 'maxDepth',
  maxqdepth: 'maxDepth',

  currentdepth: 'currentDepth',
  currdepth: 'currentDepth',
  curdepth: 'currentDepth',

  topicstring: 'topicString',
  topic: 'topicString',

  parenttopic: 'parentTopic',

  subscriptiontype: 'subscriptionType',
  subtype: 'subscriptionType',

  topicobject: 'topicName',
  topicname_ref: 'topicName',

  destinationqueue: 'destinationQueue',
  destination: 'destinationQueue',
  destqueue: 'destinationQueue',

  destinationqueuemanager: 'destinationQueueManager',
  destqmgr: 'destinationQueueManager',

  channeltype: 'channelType',

  description: 'description',
  desc: 'description',
}

function normalizeHeader(header: string): string {
  const key = header.trim().toLowerCase().replace(/[\s_./-]+/g, '')
  return COLUMN_ALIASES[key] ?? header.trim()
}

type RawRow = Record<string, string>

function inferObjectType(row: RawRow): 'queueManager' | 'queue' | 'topic' | 'subscription' | 'channel' | null {
  const explicit = (row.objectType ?? '').toLowerCase()
  if (explicit.includes('qmgr') || explicit.includes('queue manager') || explicit.includes('queuemanager')) return 'queueManager'
  if (explicit.includes('channel')) return 'channel'
  if (explicit.includes('sub')) return 'subscription'
  if (explicit.includes('topic')) return 'topic'
  if (explicit.includes('queue')) return 'queue'

  if (row.subscriptionType || row.destinationQueue || (row.topicName && !row.topicString)) return 'subscription'
  if (row.topicString) return 'topic'
  if (row.channelType) return 'channel'
  if (row.queueType || row.targetQueue || row.maxDepth || row.currentDepth) return 'queue'
  return null
}

function toNumber(value: string | undefined): number | undefined {
  if (value === undefined || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function normalizeQueueType(value: string | undefined): QueueType {
  const v = (value ?? '').toLowerCase()
  if (v.includes('alias')) return 'alias'
  if (v.includes('remote')) return 'remote'
  if (v.includes('model')) return 'model'
  if (v.includes('cluster')) return 'cluster'
  return 'local'
}

function normalizeSubscriptionType(value: string | undefined): SubscriptionType | undefined {
  if (!value) return undefined
  const v = value.toLowerCase()
  if (v.includes('non')) return 'non-durable'
  if (v.includes('managed')) return 'managed'
  if (v.includes('durable')) return 'durable'
  return undefined
}

/** Parses a CSV export (queues/topics/subscriptions/channels, optionally mixed in one file) into an MqTopology. */
export function parseCsvExport(csvText: string): MqTopology {
  const parsed = Papa.parse<RawRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normalizeHeader,
  })

  if (parsed.errors.length > 0 && parsed.data.length === 0) {
    throw new MqParseError(`Failed to parse CSV: ${parsed.errors[0].message}`)
  }

  const topology = emptyTopology()
  const qmNames = new Set<string>()

  for (const row of parsed.data) {
    const objectType = inferObjectType(row)
    const queueManager = row.queueManager?.trim() || 'UNKNOWN'
    qmNames.add(queueManager)

    if (!row.name && objectType !== 'queueManager') continue

    switch (objectType) {
      case 'queueManager': {
        const qm: QueueManager = { name: row.name?.trim() || queueManager, description: row.description }
        topology.queueManagers.push(qm)
        qmNames.add(qm.name)
        break
      }
      case 'queue': {
        const queue: Queue = {
          name: row.name.trim(),
          queueManager,
          queueType: normalizeQueueType(row.queueType),
          description: row.description || undefined,
          targetQueue: row.targetQueue || undefined,
          targetQueueManager: row.targetQueueManager || undefined,
          maxDepth: toNumber(row.maxDepth),
          currentDepth: toNumber(row.currentDepth),
        }
        topology.queues.push(queue)
        break
      }
      case 'topic': {
        const topic: Topic = {
          name: row.name.trim(),
          queueManager,
          topicString: row.topicString || '',
          parentTopic: row.parentTopic || undefined,
          description: row.description || undefined,
        }
        topology.topics.push(topic)
        break
      }
      case 'subscription': {
        const sub: Subscription = {
          name: row.name.trim(),
          queueManager,
          subscriptionType: normalizeSubscriptionType(row.subscriptionType),
          topicName: row.topicName || undefined,
          topicString: row.topicString || undefined,
          destinationQueue: row.destinationQueue || undefined,
          destinationQueueManager: row.destinationQueueManager || undefined,
          description: row.description || undefined,
        }
        topology.subscriptions.push(sub)
        break
      }
      case 'channel': {
        const channel: Channel = {
          name: row.name.trim(),
          queueManager,
          targetQueueManager: row.targetQueueManager || undefined,
          channelType: row.channelType || undefined,
          description: row.description || undefined,
        }
        topology.channels = topology.channels ?? []
        topology.channels.push(channel)
        break
      }
      default:
        break
    }
  }

  // Ensure every queue manager referenced by a row has a node, even if no explicit
  // queue-manager row was present in the export.
  const declaredQmNames = new Set(topology.queueManagers.map((qm) => qm.name))
  for (const name of qmNames) {
    if (!declaredQmNames.has(name)) {
      topology.queueManagers.push({ name })
    }
  }

  return topology
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Parses (and loosely validates) a canonical mq-topology.json export into an MqTopology. */
export function parseJsonExport(jsonText: string): MqTopology {
  let raw: unknown
  try {
    raw = JSON.parse(jsonText)
  } catch (err) {
    throw new MqParseError(`Invalid JSON: ${(err as Error).message}`)
  }
  if (!isPlainObject(raw)) {
    throw new MqParseError('Expected a JSON object with queueManagers/queues/topics/subscriptions arrays')
  }

  const topology: MqTopology = {
    queueManagers: Array.isArray(raw.queueManagers) ? (raw.queueManagers as QueueManager[]) : [],
    queues: Array.isArray(raw.queues) ? (raw.queues as Queue[]) : [],
    topics: Array.isArray(raw.topics) ? (raw.topics as Topic[]) : [],
    subscriptions: Array.isArray(raw.subscriptions) ? (raw.subscriptions as Subscription[]) : [],
    channels: Array.isArray(raw.channels) ? (raw.channels as Channel[]) : [],
  }

  if (
    topology.queueManagers.length === 0 &&
    topology.queues.length === 0 &&
    topology.topics.length === 0 &&
    topology.subscriptions.length === 0
  ) {
    throw new MqParseError('No queue managers, queues, topics, or subscriptions found in file')
  }

  const declaredQmNames = new Set(topology.queueManagers.map((qm) => qm.name))
  const referenced = new Set<string>([
    ...topology.queues.map((q) => q.queueManager),
    ...topology.topics.map((t) => t.queueManager),
    ...topology.subscriptions.map((s) => s.queueManager),
  ])
  for (const name of referenced) {
    if (name && !declaredQmNames.has(name)) {
      topology.queueManagers.push({ name })
      declaredQmNames.add(name)
    }
  }

  return topology
}

export function parseMqExport(fileName: string, text: string): MqTopology {
  if (fileName.toLowerCase().endsWith('.json')) return parseJsonExport(text)
  if (fileName.toLowerCase().endsWith('.csv')) return parseCsvExport(text)
  // Fall back to sniffing content.
  const trimmed = text.trimStart()
  if (trimmed.startsWith('{')) return parseJsonExport(text)
  return parseCsvExport(text)
}
