import { EDGE_COLORS } from '../lib/graphModel'

const LEGEND: { label: string; color: string }[] = [
  { label: 'Alias of', color: EDGE_COLORS.alias },
  { label: 'Remote to', color: EDGE_COLORS.remote },
  { label: 'Child topic', color: EDGE_COLORS.topicHierarchy },
  { label: 'Subscribes to', color: EDGE_COLORS.subscribes },
  { label: 'Delivers to', color: EDGE_COLORS.delivers },
  { label: 'Channel', color: EDGE_COLORS.channel },
]

export function Legend() {
  return (
    <div className="pointer-events-none absolute right-3 top-3 z-10 flex flex-col gap-1 rounded-md border border-slate-200 bg-white/90 px-3 py-2 shadow-sm backdrop-blur">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Relationships</div>
      {LEGEND.map((item) => (
        <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-600">
          <span className="h-0.5 w-4 rounded" style={{ backgroundColor: item.color }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}
