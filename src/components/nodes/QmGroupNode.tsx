import type { NodeProps } from '@xyflow/react'
import { ServerIcon } from '../icons'
import type { MqFlowNode } from '../../lib/graphModel'

export function QmGroupNode({ data, selected }: NodeProps<MqFlowNode>) {
  return (
    <div
      className={[
        'h-full w-full rounded-xl border-2 bg-slate-50/70',
        selected ? 'border-indigo-500' : 'border-slate-300',
      ].join(' ')}
    >
      <div className="flex items-center gap-2 rounded-t-[10px] border-b-2 border-slate-300 bg-slate-100 px-3 py-1.5">
        <ServerIcon className="h-4 w-4 text-slate-600" />
        <span className="text-sm font-bold text-slate-700">{data.label}</span>
        <span className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Queue Manager</span>
      </div>
    </div>
  )
}
