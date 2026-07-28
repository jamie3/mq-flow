import { NavLink } from 'react-router-dom'
import { CATEGORIES, type CategoryKind } from '../lib/categories'
import { useTopology } from '../state/TopologyContext'
import { QueueIcon, ServerIcon, SubscriptionIcon, TopicIcon } from './icons'

const CATEGORY_ICONS: Record<CategoryKind, typeof QueueIcon> = {
  queueManager: ServerIcon,
  queue: QueueIcon,
  topic: TopicIcon,
  subscription: SubscriptionIcon,
  channel: ServerIcon,
}

function ChannelIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} {...props}>
      <circle cx="5" cy="12" r="2.5" />
      <circle cx="19" cy="12" r="2.5" />
      <path d="M7.5 12h9" strokeDasharray="2 2" />
    </svg>
  )
}

const baseLink =
  'flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors'

export function SideMenu() {
  const { topology } = useTopology()

  const counts: Record<CategoryKind, number> = {
    queueManager: topology.queueManagers.length,
    queue: topology.queues.length,
    topic: topology.topics.length,
    subscription: topology.subscriptions.length,
    channel: topology.channels?.length ?? 0,
  }

  return (
    <nav className="flex w-60 shrink-0 flex-col gap-1 border-r border-slate-200 bg-white p-3">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          `${baseLink} ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`
        }
      >
        <span className="flex items-center gap-2">
          <ServerIcon className="h-4 w-4" />
          Overview
        </span>
      </NavLink>

      <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Objects
      </div>

      {CATEGORIES.map((cat) => {
        const Icon = cat.kind === 'channel' ? ChannelIcon : CATEGORY_ICONS[cat.kind]
        return (
          <NavLink
            key={cat.slug}
            to={`/list/${cat.slug}`}
            className={({ isActive }) =>
              `${baseLink} ${isActive ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`
            }
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {cat.label}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
              {counts[cat.kind]}
            </span>
          </NavLink>
        )
      })}
    </nav>
  )
}
