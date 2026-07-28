import { Handle, Position, type NodeProps } from '@xyflow/react'
import { QueueIcon, SubscriptionIcon, TopicIcon } from '../icons'
import type { MqFlowNode } from '../../lib/buildGraph'

const KIND_STYLES: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  queue: { bg: 'bg-sky-50', border: 'border-sky-400', text: 'text-sky-900', icon: 'text-sky-500' },
  topic: { bg: 'bg-amber-50', border: 'border-amber-400', text: 'text-amber-900', icon: 'text-amber-500' },
  subscription: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    text: 'text-emerald-900',
    icon: 'text-emerald-500',
  },
}

const ICONS: Record<string, typeof QueueIcon> = {
  queue: QueueIcon,
  topic: TopicIcon,
  subscription: SubscriptionIcon,
}

export function MqNode({ data, selected }: NodeProps<MqFlowNode>) {
  const style = KIND_STYLES[data.kind] ?? KIND_STYLES.queue
  const Icon = ICONS[data.kind] ?? QueueIcon

  return (
    <div
      className={[
        'w-[200px] rounded-lg border-2 px-3 py-2 shadow-sm transition-shadow',
        style.bg,
        style.border,
        data.virtual ? 'border-dashed opacity-70' : '',
        selected ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Top} className="!bg-slate-400" />
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
        <div className="min-w-0">
          <div className={`truncate text-sm font-semibold ${style.text}`} title={data.label}>
            {data.label}
          </div>
          {data.subtype && (
            <div className="truncate text-[10px] font-medium uppercase tracking-wide text-slate-500" title={data.subtype}>
              {data.subtype}
            </div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-slate-400" />
    </div>
  )
}
