import Papa from 'papaparse'
import type { Channel, Queue, QueueType, Subscription, SubscriptionType, Topic } from '../types/mq'

export type CsvObjectKind = 'queue' | 'topic' | 'subscription' | 'channel'

export type RawRow = Record<string, string>

export interface ParsedCsv {
  kind: CsvObjectKind | null
  headers: string[]
  rows: RawRow[]
}

/** The object tree for a single queue manager, built from one or more CSV files. */
export interface BuiltQueueManager {
  name: string
  queues: Queue[]
  topics: Topic[]
  subscriptions: Subscription[]
  channels: Channel[]
}

const KIND_LABELS: Record<CsvObjectKind, string> = {
  queue: 'Queues',
  topic: 'Topics',
  subscription: 'Subscriptions',
  channel: 'Channels',
}

export function kindLabel(kind: CsvObjectKind): string {
  return KIND_LABELS[kind]
}

function headerSet(headers: string[]): Set<string> {
  return new Set(headers.map((h) => h.trim().toLowerCase()))
}

/**
 * Determines which MQ object a CSV export contains from its header row. Subscriptions and topics
 * both carry "Topic name"/"Topic string", so the more specific identifying column is checked first.
 */
export function detectKind(headers: string[]): CsvObjectKind | null {
  const s = headerSet(headers)
  if (s.has('subscription name')) return 'subscription'
  if (s.has('channel name')) return 'channel'
  if (s.has('queue name')) return 'queue'
  if (s.has('topic name')) return 'topic'
  return null
}

export function parseCsv(text: string): ParsedCsv {
  const result = Papa.parse<RawRow>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim(),
  })
  const headers = result.meta.fields ?? []
  return { kind: detectKind(headers), headers, rows: result.data }
}

function num(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

/** Collects every non-empty column (except the excluded ones) as free-form properties. */
function collectAttributes(row: RawRow, exclude: string[]): Record<string, string | number> {
  const out: Record<string, string | number> = {}
  const skip = new Set(exclude.map((e) => e.toLowerCase()))
  for (const [key, value] of Object.entries(row)) {
    if (value == null) continue
    const str = String(value).trim()
    if (str === '') continue
    if (skip.has(key.trim().toLowerCase())) continue
    out[key] = str
  }
  return out
}

function normalizeQueueType(value: string | undefined): QueueType {
  const v = (value ?? '').toLowerCase()
  if (v.includes('alias')) return 'alias'
  if (v.includes('remote')) return 'remote'
  if (v.includes('model')) return 'model'
  if (v.includes('cluster')) return 'cluster'
  return 'local'
}

function normalizeSubscriptionType(row: RawRow): SubscriptionType | undefined {
  const destClass = (row['Destination class'] ?? '').toLowerCase()
  if (destClass.includes('managed')) return 'managed'
  const durable = (row['Durable'] ?? '').toLowerCase()
  if (durable.startsWith('y') || durable.includes('durable')) return 'durable'
  if (durable.startsWith('n')) return 'non-durable'
  return undefined
}

function toQueue(row: RawRow, qm: string): Queue | null {
  const name = row['Queue name']?.trim()
  if (!name) return null
  const queueType = normalizeQueueType(row['Queue type'])
  const queue: Queue = {
    name,
    queueManager: qm,
    queueType,
    description: row['Description']?.trim() || undefined,
    currentDepth: num(row['Current queue depth']),
    attributes: collectAttributes(row, ['Queue name']),
  }
  if (queueType === 'remote') {
    queue.targetQueue = row['Remote queue']?.trim() || undefined
    queue.targetQueueManager = row['Remote queue manager']?.trim() || undefined
  } else if (queueType === 'alias') {
    // For alias queues MQ Explorer records the target in "Base object".
    queue.targetQueue = row['Base object']?.trim() || undefined
  }
  return queue
}

function toTopic(row: RawRow, qm: string): Topic | null {
  const name = row['Topic name']?.trim()
  if (!name) return null
  return {
    name,
    queueManager: qm,
    topicString: row['Topic string']?.trim() || '',
    description: row['Description']?.trim() || undefined,
    attributes: collectAttributes(row, ['Topic name']),
  }
}

function toSubscription(row: RawRow, qm: string): Subscription | null {
  const name = row['Subscription name']?.trim()
  if (!name) return null
  return {
    name,
    queueManager: qm,
    subscriptionType: normalizeSubscriptionType(row),
    topicName: row['Topic name']?.trim() || undefined,
    topicString: row['Topic string']?.trim() || undefined,
    destinationQueue: row['Destination name']?.trim() || undefined,
    destinationQueueManager: row['Destination queue manager']?.trim() || undefined,
    attributes: collectAttributes(row, ['Subscription name']),
  }
}

function toChannel(row: RawRow, qm: string): Channel | null {
  const name = row['Channel name']?.trim()
  if (!name) return null
  return {
    name,
    queueManager: qm,
    channelType: row['Channel type']?.trim() || undefined,
    description: row['Description']?.trim() || undefined,
    attributes: collectAttributes(row, ['Channel name']),
  }
}

export interface CsvSource {
  kind: CsvObjectKind
  rows: RawRow[]
}

/** Builds a queue manager's object tree by mapping each recognized CSV's rows into the model. */
export function buildQueueManager(name: string, sources: CsvSource[]): BuiltQueueManager {
  const built: BuiltQueueManager = { name, queues: [], topics: [], subscriptions: [], channels: [] }

  for (const source of sources) {
    for (const row of source.rows) {
      switch (source.kind) {
        case 'queue': {
          const q = toQueue(row, name)
          if (q) built.queues.push(q)
          break
        }
        case 'topic': {
          const t = toTopic(row, name)
          if (t) built.topics.push(t)
          break
        }
        case 'subscription': {
          const s = toSubscription(row, name)
          if (s) built.subscriptions.push(s)
          break
        }
        case 'channel': {
          const c = toChannel(row, name)
          if (c) built.channels.push(c)
          break
        }
      }
    }
  }

  return built
}
