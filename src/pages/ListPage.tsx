import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { CATEGORY_BY_SLUG, objectPath, type Category } from '../lib/categories'
import { useTopology } from '../state/TopologyContext'
import type { MqTopology } from '../types/mq'

interface Row {
  name: string
  queueManager: string
  detail: string
  /** Extra fields to match against when searching. */
  haystack: string
}

function rowsForCategory(category: Category, topology: MqTopology): Row[] {
  switch (category.kind) {
    case 'queueManager':
      return topology.queueManagers.map((qm) => ({
        name: qm.name,
        queueManager: qm.name,
        detail: qm.description ?? '',
        haystack: `${qm.name} ${qm.description ?? ''}`.toLowerCase(),
      }))
    case 'queue':
      return topology.queues.map((q) => ({
        name: q.name,
        queueManager: q.queueManager,
        detail: q.queueType + (q.targetQueue ? ` → ${q.targetQueue}` : ''),
        haystack: `${q.name} ${q.queueManager} ${q.queueType} ${q.targetQueue ?? ''} ${q.description ?? ''}`.toLowerCase(),
      }))
    case 'topic':
      return topology.topics.map((t) => ({
        name: t.name,
        queueManager: t.queueManager,
        detail: t.topicString,
        haystack: `${t.name} ${t.queueManager} ${t.topicString} ${t.description ?? ''}`.toLowerCase(),
      }))
    case 'subscription':
      return topology.subscriptions.map((s) => ({
        name: s.name,
        queueManager: s.queueManager,
        detail: [s.subscriptionType, s.topicName, s.destinationQueue].filter(Boolean).join(' · '),
        haystack: `${s.name} ${s.queueManager} ${s.subscriptionType ?? ''} ${s.topicName ?? ''} ${s.topicString ?? ''} ${s.destinationQueue ?? ''}`.toLowerCase(),
      }))
    case 'channel':
      return (topology.channels ?? []).map((c) => ({
        name: c.name,
        queueManager: c.queueManager,
        detail: [c.channelType, c.targetQueueManager && `→ ${c.targetQueueManager}`].filter(Boolean).join(' '),
        haystack: `${c.name} ${c.queueManager} ${c.channelType ?? ''} ${c.targetQueueManager ?? ''}`.toLowerCase(),
      }))
  }
}

export function ListPage() {
  const { slug } = useParams<{ slug: string }>()
  const { topology } = useTopology()
  const [query, setQuery] = useState('')

  const category = slug ? CATEGORY_BY_SLUG.get(slug) : undefined

  const allRows = useMemo(
    () => (category ? rowsForCategory(category, topology) : []),
    [category, topology],
  )
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return allRows
    return allRows.filter((r) => r.haystack.includes(q))
  }, [allRows, query])

  if (!category) return <Navigate to="/" replace />

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">{category.label}</h2>
          <p className="text-xs text-slate-500">
            {rows.length} of {allRows.length}
          </p>
        </div>
        <div className="ml-auto">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Search ${category.label.toLowerCase()}…`}
            className="w-72 rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        {rows.length === 0 ? (
          <div className="py-16 text-center text-sm text-slate-400">
            {allRows.length === 0 ? `No ${category.label.toLowerCase()} in the loaded topology.` : 'No matches.'}
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => (
              <li key={`${row.queueManager}::${row.name}`}>
                <Link
                  to={objectPath(category.kindSlug, row.queueManager, row.name)}
                  className="flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm transition-colors hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="truncate font-semibold text-slate-800" title={row.name}>
                    {row.name}
                  </span>
                  <span className="text-xs text-slate-500">
                    {category.kind === 'queueManager' ? row.detail : `on ${row.queueManager}`}
                  </span>
                  {category.kind !== 'queueManager' && row.detail && (
                    <span className="truncate text-xs text-slate-400" title={row.detail}>
                      {row.detail}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
