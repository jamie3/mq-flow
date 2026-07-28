import type { MqNodeKind } from './graphModel'

export type CategoryKind = MqNodeKind | 'channel'

export interface Category {
  /** URL slug, e.g. "queue-managers". */
  slug: string
  /** Singular kind slug used in object routes, e.g. "queue-manager". */
  kindSlug: string
  kind: CategoryKind
  label: string
  singular: string
}

export const CATEGORIES: Category[] = [
  { slug: 'queue-managers', kindSlug: 'queue-manager', kind: 'queueManager', label: 'Queue Managers', singular: 'Queue Manager' },
  { slug: 'queues', kindSlug: 'queue', kind: 'queue', label: 'Queues', singular: 'Queue' },
  { slug: 'topics', kindSlug: 'topic', kind: 'topic', label: 'Topics', singular: 'Topic' },
  { slug: 'subscriptions', kindSlug: 'subscription', kind: 'subscription', label: 'Subscriptions', singular: 'Subscription' },
  { slug: 'channels', kindSlug: 'channel', kind: 'channel', label: 'Channels', singular: 'Channel' },
]

export const CATEGORY_BY_SLUG = new Map(CATEGORIES.map((c) => [c.slug, c]))
export const CATEGORY_BY_KIND_SLUG = new Map(CATEGORIES.map((c) => [c.kindSlug, c]))

/** Builds the route to an object's focused flow page. */
export function objectPath(kindSlug: string, queueManager: string, name: string): string {
  return `/object/${kindSlug}/${encodeURIComponent(queueManager)}/${encodeURIComponent(name)}`
}
