import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  buildQueueManager,
  kindLabel,
  parseCsv,
  type CsvObjectKind,
  type RawRow,
} from '../lib/importCsv'
import { useTopology } from '../state/TopologyContext'
import { UploadIcon } from './icons'

interface SelectedFile {
  id: string
  fileName: string
  kind: CsvObjectKind | null
  rowCount: number
  rows: RawRow[]
}

type Step = 'name' | 'files' | 'confirm'

interface ImportModalProps {
  onClose: () => void
}

const KIND_BADGE: Record<CsvObjectKind, string> = {
  queue: 'bg-sky-100 text-sky-700',
  topic: 'bg-amber-100 text-amber-700',
  subscription: 'bg-emerald-100 text-emerald-700',
  channel: 'bg-rose-100 text-rose-700',
}

export function ImportModal({ onClose }: ImportModalProps) {
  const { hasStoredQueueManager, importQueueManager } = useTopology()
  const navigate = useNavigate()
  const inputRef = useRef<HTMLInputElement>(null)

  const [step, setStep] = useState<Step>('name')
  const [qmName, setQmName] = useState('')
  const [files, setFiles] = useState<SelectedFile[]>([])

  const recognized = files.filter((f): f is SelectedFile & { kind: CsvObjectKind } => f.kind !== null)
  const trimmedName = qmName.trim()

  const addFiles = async (fileList: FileList) => {
    const added: SelectedFile[] = []
    for (const file of Array.from(fileList)) {
      const text = await file.text()
      const parsed = parseCsv(text)
      added.push({
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        fileName: file.name,
        kind: parsed.kind,
        rowCount: parsed.rows.length,
        rows: parsed.rows,
      })
    }
    setFiles((prev) => [...prev, ...added])
  }

  const removeFile = (id: string) => setFiles((prev) => prev.filter((f) => f.id !== id))

  const commit = (replace: boolean) => {
    const built = buildQueueManager(
      trimmedName,
      recognized.map((f) => ({ kind: f.kind, rows: f.rows })),
    )
    importQueueManager(built, replace)
    onClose()
    navigate('/explore')
  }

  const handleImport = () => {
    if (recognized.length === 0) return
    if (hasStoredQueueManager(trimmedName)) {
      setStep('confirm')
    } else {
      commit(false)
    }
  }

  const totals = recognized.reduce<Record<string, number>>((acc, f) => {
    acc[f.kind] = (acc[f.kind] ?? 0) + f.rowCount
    return acc
  }, {})

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-800">Import MQ export</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Step 1 — queue manager name */}
        {step === 'name' && (
          <form
            className="flex flex-col gap-4 p-5"
            onSubmit={(e) => {
              e.preventDefault()
              if (trimmedName) setStep('files')
            }}
          >
            <div>
              <label htmlFor="qm-name" className="mb-1 block text-sm font-medium text-slate-700">
                Queue Manager name
              </label>
              <input
                id="qm-name"
                autoFocus
                value={qmName}
                onChange={(e) => setQmName(e.target.value)}
                placeholder="e.g. QM1"
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
              />
              <p className="mt-1.5 text-xs text-slate-500">
                All objects in the CSV files you pick next will be imported under this queue manager.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!trimmedName}
                className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Continue
              </button>
            </div>
          </form>
        )}

        {/* Step 2 — CSV files */}
        {step === 'files' && (
          <>
            <div className="flex flex-col gap-3 overflow-y-auto p-5">
              <div className="text-xs text-slate-500">
                Queue Manager: <span className="font-semibold text-slate-700">{trimmedName}</span>
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 hover:border-indigo-400 hover:bg-indigo-50/40"
              >
                <UploadIcon className="h-6 w-6" />
                Choose CSV files…
                <span className="text-xs text-slate-400">
                  Queues, Topics, Subscriptions and Channels are detected automatically
                </span>
              </button>
              <input
                ref={inputRef}
                type="file"
                accept=".csv,text/csv"
                multiple
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) void addFiles(e.target.files)
                  e.target.value = ''
                }}
              />

              {files.length > 0 && (
                <ul className="flex flex-col gap-1.5">
                  {files.map((f) => (
                    <li
                      key={f.id}
                      className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 flex-1 truncate text-slate-700" title={f.fileName}>
                        {f.fileName}
                      </span>
                      {f.kind ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${KIND_BADGE[f.kind]}`}>
                          {kindLabel(f.kind)} · {f.rowCount}
                        </span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                          Unrecognized
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeFile(f.id)}
                        className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label={`Remove ${f.fileName}`}
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {files.some((f) => f.kind === null) && (
                <p className="text-xs text-amber-700">
                  Some files weren’t recognized as MQ exports and will be skipped. Expected a header row with a
                  “Queue name”, “Topic name”, “Subscription name”, or “Channel name” column.
                </p>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-3">
              <button
                type="button"
                onClick={() => setStep('name')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                ← Back
              </button>
              <div className="flex items-center gap-3">
                {recognized.length > 0 && (
                  <span className="text-xs text-slate-500">
                    {Object.entries(totals)
                      .map(([kind, n]) => `${n} ${kindLabel(kind as CsvObjectKind).toLowerCase()}`)
                      .join(', ')}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleImport}
                  disabled={recognized.length === 0}
                  className="rounded-md bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Import
                </button>
              </div>
            </div>
          </>
        )}

        {/* Step 3 — confirm replace */}
        {step === 'confirm' && (
          <div className="flex flex-col gap-4 p-5">
            <p className="text-sm text-slate-700">
              A queue manager named <span className="font-semibold">{trimmedName}</span> already exists in your
              saved data. Replacing it removes its current queues, topics, subscriptions, and channels and
              rebuilds them from these files.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep('files')}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => commit(true)}
                className="rounded-md bg-rose-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Replace
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
