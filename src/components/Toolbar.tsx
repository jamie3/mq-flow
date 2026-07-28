import { useRef } from 'react'
import { SparkleIcon, UploadIcon } from './icons'
import { EDGE_COLORS } from '../lib/buildGraph'

interface ToolbarProps {
  fileName: string | null
  error: string | null
  onFileSelected: (file: File) => void
  onLoadSample: () => void
}

const LEGEND: { label: string; color: string }[] = [
  { label: 'Alias of', color: EDGE_COLORS.alias },
  { label: 'Remote to', color: EDGE_COLORS.remote },
  { label: 'Child topic', color: EDGE_COLORS.topicHierarchy },
  { label: 'Subscribes to', color: EDGE_COLORS.subscribes },
  { label: 'Delivers to', color: EDGE_COLORS.delivers },
  { label: 'Channel', color: EDGE_COLORS.channel },
]

export function Toolbar({ fileName, error, onFileSelected, onLoadSample }: ToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <div className="flex items-center gap-2 pr-2">
        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <h1 className="text-sm font-bold text-slate-800">MQ Flow</h1>
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        Load export…
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onFileSelected(file)
          e.target.value = ''
        }}
      />

      <button
        type="button"
        onClick={onLoadSample}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <SparkleIcon className="h-3.5 w-3.5" />
        Load sample data
      </button>

      {fileName && <span className="text-xs text-slate-500">Loaded: {fileName}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}

      <div className="ml-auto flex flex-wrap items-center gap-3">
        {LEGEND.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <span className="h-0.5 w-4 rounded" style={{ backgroundColor: item.color }} />
            {item.label}
          </div>
        ))}
      </div>
    </header>
  )
}
