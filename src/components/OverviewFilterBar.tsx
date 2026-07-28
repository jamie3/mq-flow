import type { ObjectKind } from '../lib/filterTopology'

const KIND_CHIPS: { kind: ObjectKind; label: string }[] = [
  { kind: 'queue', label: 'Queues' },
  { kind: 'topic', label: 'Topics' },
  { kind: 'subscription', label: 'Subscriptions' },
  { kind: 'channel', label: 'Channels' },
]

interface OverviewFilterBarProps {
  query: string
  onQueryChange: (value: string) => void
  hidden: Set<ObjectKind>
  onToggleKind: (kind: ObjectKind) => void
  shown: number
  total: number
}

export function OverviewFilterBar({
  query,
  onQueryChange,
  hidden,
  onToggleKind,
  shown,
  total,
}: OverviewFilterBarProps) {
  return (
    <div className="absolute left-3 top-3 z-10 flex w-72 flex-col gap-2 rounded-md border border-slate-200 bg-white/95 p-2.5 shadow-sm backdrop-blur">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Filter by name or any field…"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 pr-7 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Clear filter"
          >
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-1">
        {KIND_CHIPS.map((chip) => {
          const on = !hidden.has(chip.kind)
          return (
            <button
              key={chip.kind}
              type="button"
              onClick={() => onToggleKind(chip.kind)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition-colors ${
                on
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-white text-slate-400 line-through'
              }`}
              aria-pressed={on}
            >
              {chip.label}
            </button>
          )
        })}
      </div>

      <div className="px-0.5 text-[11px] text-slate-500">
        Showing {shown} of {total} objects
      </div>
    </div>
  )
}
