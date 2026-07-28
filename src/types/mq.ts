export type QueueType = 'local' | 'alias' | 'remote' | 'model' | 'cluster'

export type SubscriptionType = 'durable' | 'non-durable' | 'managed'

export interface QueueManager {
  name: string
  description?: string
  attributes?: Record<string, string | number>
}

export interface Queue {
  name: string
  queueManager: string
  queueType: QueueType
  description?: string
  /** Alias queues resolve to another queue on the same queue manager. */
  targetQueue?: string
  /** Remote queues (and remote-queue-definitions) point at a queue on another queue manager. */
  targetQueueManager?: string
  maxDepth?: number
  currentDepth?: number
  attributes?: Record<string, string | number>
}

export interface Topic {
  name: string
  queueManager: string
  topicString: string
  /** Name of the parent topic in the topic tree, if any. */
  parentTopic?: string
  description?: string
  attributes?: Record<string, string | number>
}

export interface Subscription {
  name: string
  queueManager: string
  subscriptionType?: SubscriptionType
  /** The administrative topic object this subscription targets, if any. */
  topicName?: string
  /** The raw topic string, used when a subscription targets a string rather than a topic object. */
  topicString?: string
  /** Destination queue that receives publications (durable/managed subscriptions). */
  destinationQueue?: string
  destinationQueueManager?: string
  description?: string
  attributes?: Record<string, string | number>
}

export interface Channel {
  name: string
  queueManager: string
  targetQueueManager?: string
  channelType?: string
  description?: string
  attributes?: Record<string, string | number>
}

export interface MqTopology {
  queueManagers: QueueManager[]
  queues: Queue[]
  topics: Topic[]
  subscriptions: Subscription[]
  channels?: Channel[]
}

export function emptyTopology(): MqTopology {
  return { queueManagers: [], queues: [], topics: [], subscriptions: [], channels: [] }
}
