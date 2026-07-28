import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ImportModal } from './ImportModal'
import { SparkleIcon, UploadIcon } from './icons'
import { useTopology } from '../state/TopologyContext'

export function TopBar() {
  const { fileName, error, loadSample } = useTopology()
  const [importOpen, setImportOpen] = useState(false)

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
      <Link to="/" className="flex items-center gap-2 pr-2">
        <div className="h-2.5 w-2.5 rounded-full bg-indigo-500" />
        <h1 className="text-sm font-bold text-slate-800">MQ Flow</h1>
      </Link>

      <button
        type="button"
        onClick={() => setImportOpen(true)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <UploadIcon className="h-3.5 w-3.5" />
        Load export…
      </button>

      <button
        type="button"
        onClick={loadSample}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
      >
        <SparkleIcon className="h-3.5 w-3.5" />
        Load sample data
      </button>

      {fileName && <span className="truncate text-xs text-slate-500">Loaded: {fileName}</span>}
      {error && <span className="text-xs font-medium text-rose-600">{error}</span>}

      {importOpen && <ImportModal onClose={() => setImportOpen(false)} />}
    </header>
  )
}
