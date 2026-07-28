import { QueueIcon, ServerIcon, SubscriptionIcon, TopicIcon } from './icons'
import type { MqFlowNode } from '../lib/graphModel'

const KIND_ICONS = {
  queueManager: ServerIcon,
  queue: QueueIcon,
  topic: TopicIcon,
  subscription: SubscriptionIcon,
} as const

const KIND_LABELS: Record<string, string> = {
  queueManager: 'Queue Manager',
  queue: 'Queue',
  topic: 'Topic',
  subscription: 'Subscription',
}

interface SidebarProps {
  node: MqFlowNode | null
  onClose: () => void
  /** When provided, renders an "Explore relationships" button that navigates to the object's flow. */
  onExplore?: () => void
}

export function Sidebar({ node, onClose, onExplore }: SidebarProps) {
  // Hide the panel entirely when nothing is selected.
  if (!node) return null

  const { data } = node
  const Icon = KIND_ICONS[data.kind as keyof typeof KIND_ICONS] ?? QueueIcon
  const attributeEntries = Object.entries(data.attributes ?? {})

  return (
    <aside className="flex w-80 shrink-0 flex-col overflow-y-auto border-l border-slate-200 bg-white">
      <div className="flex items-start justify-between gap-2 border-b border-slate-200 p-4">
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-5 w-5 text-slate-500" />
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {KIND_LABELS[data.kind] ?? data.kind}
            </div>
            <div className="break-all text-base font-semibold text-slate-800">{data.label}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Close details"
        >
          ✕
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 text-sm">
        {onExplore && (
          <button
            type="button"
            onClick={onExplore}
            className="flex items-center justify-center gap-1.5 rounded-md bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            Explore relationships →
          </button>
        )}

        {data.virtual && (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Referenced but not present as an object in the export — shown as inferred from a relationship.
          </div>
        )}

        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Queue Manager</div>
          <div className="text-slate-700">{data.queueManager}</div>
        </div>

        {data.subtype && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">
              {data.kind === 'topic' ? 'Topic String' : data.kind === 'queue' ? 'Queue Type' : 'Subscription Type'}
            </div>
            <div className="break-all text-slate-700">{data.subtype}</div>
          </div>
        )}

        {data.description && (
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</div>
            <div className="text-slate-700">{data.description}</div>
          </div>
        )}

        {attributeEntries.length > 0 && (
          <div>
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Attributes</div>
            <dl className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {attributeEntries.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-2 px-2 py-1.5 text-xs">
                  <dt className="text-slate-500">{key}</dt>
                  <dd className="break-all text-right font-medium text-slate-700">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>
    </aside>
  )
}
