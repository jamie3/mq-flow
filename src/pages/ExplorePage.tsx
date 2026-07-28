import { useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { QueueIcon, ServerIcon, SubscriptionIcon, TopicIcon } from '../components/icons'
import { objectPath } from '../lib/categories'
import type { MqNodeKind } from '../lib/graphModel'
import { useTopology } from '../state/TopologyContext'
import type { Channel, Queue, Subscription, Topic } from '../types/mq'

interface TreeRowProps {
  level: number
  label: ReactNode
  icon?: ReactNode
  badge?: ReactNode
  defaultOpen?: boolean
  hasChildren?: boolean
  onLabelClick?: () => void
  action?: ReactNode
  children?: ReactNode
}

function TreeRow({
  level,
  label,
  icon,
  badge,
  defaultOpen = false,
  hasChildren = true,
  onLabelClick,
  action,
  children,
}: TreeRowProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <div
        className="group flex items-center gap-1.5 rounded-md py-1.5 pr-2 hover:bg-slate-50"
        style={{ paddingLeft: level * 18 + 4 }}
      >
        <button
          type="button"
          onClick={() => hasChildren && setOpen((o) => !o)}
          className={`flex h-4 w-4 shrink-0 items-center justify-center text-slate-400 ${
            hasChildren ? 'hover:text-slate-600' : 'invisible'
          }`}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        {icon && <span className="shrink-0 text-slate-500">{icon}</span>}
        <span
          className={`min-w-0 flex-1 truncate text-sm ${
            onLabelClick
              ? 'cursor-pointer text-slate-700 hover:text-indigo-600 hover:underline'
              : hasChildren
                ? 'cursor-pointer text-slate-700'
                : 'text-slate-700'
          }`}
          onClick={onLabelClick ?? (hasChildren ? () => setOpen((o) => !o) : undefined)}
          title={typeof label === 'string' ? label : undefined}
        >
          {label}
        </span>
        {badge}
        {action && <span className="opacity-0 transition-opacity group-hover:opacity-100">{action}</span>}
      </div>
      {open && children}
    </div>
  )
}

function CountBadge({ n }: { n: number }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">{n}</span>
  )
}

function TypeBadge({ text }: { text: string }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
      {text}
    </span>
  )
}

function Properties({ level, entries }: { level: number; entries: [string, string | number][] }) {
  if (entries.length === 0) {
    return (
      <div className="py-1.5 text-xs text-slate-400" style={{ paddingLeft: level * 18 + 26 }}>
        No properties.
      </div>
    )
  }
  return (
    <dl className="py-1" style={{ paddingLeft: level * 18 + 26 }}>
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-3 py-0.5 text-xs">
          <dt className="w-48 shrink-0 text-slate-400">{key}</dt>
          <dd className="min-w-0 break-words font-medium text-slate-600">{String(value)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Object properties: the imported CSV columns, or the typed fields when attributes are sparse. */
function propertiesFor(
  kind: MqNodeKind | 'channel',
  obj: Queue | Topic | Subscription | Channel,
): [string, string | number][] {
  const attrs = obj.attributes ?? {}
  if (Object.keys(attrs).length > 0) return Object.entries(attrs)

  const out: [string, string | number][] = []
  const push = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== '') out.push([k, v])
  }
  if (kind === 'queue') {
    const q = obj as Queue
    push('Queue type', q.queueType)
    push('Target queue', q.targetQueue)
    push('Target queue manager', q.targetQueueManager)
    push('Current depth', q.currentDepth)
    push('Description', q.description)
  } else if (kind === 'topic') {
    const t = obj as Topic
    push('Topic string', t.topicString)
    push('Description', t.description)
  } else if (kind === 'subscription') {
    const s = obj as Subscription
    push('Type', s.subscriptionType)
    push('Topic', s.topicName ?? s.topicString)
    push('Destination queue', s.destinationQueue)
  } else if (kind === 'channel') {
    const c = obj as Channel
    push('Channel type', c.channelType)
    push('Description', c.description)
  }
  return out
}

const KIND_SLUG: Record<MqNodeKind, string> = {
  queueManager: 'queue-manager',
  queue: 'queue',
  topic: 'topic',
  subscription: 'subscription',
}

interface Group {
  kind: MqNodeKind
  label: string
  icon: ReactNode
  items: (Queue | Topic | Subscription | Channel)[]
  subtypeOf: (o: Queue | Topic | Subscription | Channel) => string | undefined
}

export function ExplorePage() {
  const { topology } = useTopology()
  const navigate = useNavigate()

  if (topology.queueManagers.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-8 text-center text-sm text-slate-500">
        No topology loaded. Use “Load export…” to import CSV files, or “Load sample data”.
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-800">Explore</h2>
        <p className="text-xs text-slate-500">Browse queue managers, their objects, and properties.</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {topology.queueManagers.map((qm) => {
          const groups: Group[] = [
            {
              kind: 'queue',
              label: 'Queues',
              icon: <QueueIcon className="h-4 w-4" />,
              items: topology.queues.filter((q) => q.queueManager === qm.name),
              subtypeOf: (o) => (o as Queue).queueType,
            },
            {
              kind: 'topic',
              label: 'Topics',
              icon: <TopicIcon className="h-4 w-4" />,
              items: topology.topics.filter((t) => t.queueManager === qm.name),
              subtypeOf: (o) => (o as Topic).topicString,
            },
            {
              kind: 'subscription',
              label: 'Subscriptions',
              icon: <SubscriptionIcon className="h-4 w-4" />,
              items: topology.subscriptions.filter((s) => s.queueManager === qm.name),
              subtypeOf: (o) => (o as Subscription).subscriptionType,
            },
            {
              kind: 'queue', // channels reuse a neutral icon; handled below
              label: 'Channels',
              icon: <ServerIcon className="h-4 w-4" />,
              items: (topology.channels ?? []).filter((c) => c.queueManager === qm.name),
              subtypeOf: (o) => (o as Channel).channelType,
            },
          ]

          return (
            <TreeRow
              key={qm.name}
              level={0}
              defaultOpen
              icon={<ServerIcon className="h-4 w-4" />}
              label={qm.name}
              badge={<TypeBadge text="Queue Manager" />}
              onLabelClick={() => navigate(objectPath('queue-manager', qm.name, qm.name))}
            >
              {groups.map((group) => {
                // Channels are their own object kind for routing even though the group reuses styling.
                const isChannel = group.label === 'Channels'
                const routeSlug = isChannel ? 'channel' : KIND_SLUG[group.kind]
                const propKind: MqNodeKind | 'channel' = isChannel ? 'channel' : group.kind
                return (
                  <TreeRow
                    key={group.label}
                    level={1}
                    icon={group.icon}
                    label={group.label}
                    badge={<CountBadge n={group.items.length} />}
                    hasChildren={group.items.length > 0}
                  >
                    {group.items.map((item) => {
                      const subtype = group.subtypeOf(item)
                      return (
                        <TreeRow
                          key={`${group.label}:${item.name}`}
                          level={2}
                          label={item.name}
                          badge={subtype ? <TypeBadge text={subtype} /> : undefined}
                          onLabelClick={() =>
                            navigate(objectPath(routeSlug, qm.name, item.name))
                          }
                          action={
                            <button
                              type="button"
                              onClick={() => navigate(objectPath(routeSlug, qm.name, item.name))}
                              className="rounded px-1.5 py-0.5 text-[11px] font-medium text-indigo-600 hover:bg-indigo-50"
                            >
                              Flow →
                            </button>
                          }
                        >
                          <Properties level={3} entries={propertiesFor(propKind, item)} />
                        </TreeRow>
                      )
                    })}
                  </TreeRow>
                )
              })}
            </TreeRow>
          )
        })}
      </div>
    </div>
  )
}
