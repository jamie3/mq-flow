import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { BuiltQueueManager } from '../lib/importCsv'
import { MqParseError, parseMqExport } from '../lib/parseMqExport'
import { emptyTopology, type MqTopology } from '../types/mq'

const SAMPLE_DATA_URL = `${import.meta.env.BASE_URL}sample-data/mq-topology.json`
const STORAGE_KEY = 'mq-flow:topology'

function normalizeStored(raw: unknown): MqTopology | null {
  if (!raw || typeof raw !== 'object') return null
  const obj = raw as Partial<MqTopology>
  const t: MqTopology = {
    queueManagers: Array.isArray(obj.queueManagers) ? obj.queueManagers : [],
    queues: Array.isArray(obj.queues) ? obj.queues : [],
    topics: Array.isArray(obj.topics) ? obj.topics : [],
    subscriptions: Array.isArray(obj.subscriptions) ? obj.subscriptions : [],
    channels: Array.isArray(obj.channels) ? obj.channels : [],
  }
  return t.queueManagers.length ? t : null
}

function loadStored(): MqTopology | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalizeStored(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

function persist(topology: MqTopology) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(topology))
  } catch {
    // Ignore quota / private-mode failures; the app still works in-memory.
  }
}

/** Removes a queue manager and all objects that belong to it. */
function removeQueueManager(topology: MqTopology, name: string): MqTopology {
  return {
    queueManagers: topology.queueManagers.filter((q) => q.name !== name),
    queues: topology.queues.filter((q) => q.queueManager !== name),
    topics: topology.topics.filter((t) => t.queueManager !== name),
    subscriptions: topology.subscriptions.filter((s) => s.queueManager !== name),
    channels: (topology.channels ?? []).filter((c) => c.queueManager !== name),
  }
}

interface TopologyContextValue {
  topology: MqTopology
  fileName: string | null
  error: string | null
  loading: boolean
  loadSample: () => void
  loadFile: (file: File) => void
  /** True when a queue manager of this name already exists in persisted storage. */
  hasStoredQueueManager: (name: string) => boolean
  /** Merges a built queue manager into persisted storage, optionally replacing an existing one. */
  importQueueManager: (built: BuiltQueueManager, replace: boolean) => void
}

const TopologyContext = createContext<TopologyContextValue | null>(null)

export function TopologyProvider({ children }: { children: ReactNode }) {
  const [topology, setTopology] = useState<MqTopology>(() => loadStored() ?? emptyTopology())
  const [fileName, setFileName] = useState<string | null>(() =>
    loadStored() ? 'saved topology (local storage)' : null,
  )
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const loadSample = useCallback(() => {
    setError(null)
    setLoading(true)
    fetch(SAMPLE_DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load sample data (${res.status})`)
        return res.text()
      })
      .then((text) => {
        setTopology(parseMqExport('mq-topology.json', text))
        setFileName('sample-data/mq-topology.json')
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const loadFile = useCallback((file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        setTopology(parseMqExport(file.name, text))
        setFileName(file.name)
      } catch (err) {
        setError(err instanceof MqParseError ? err.message : 'Failed to parse file')
      }
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }, [])

  const hasStoredQueueManager = useCallback((name: string): boolean => {
    const stored = loadStored()
    return !!stored?.queueManagers.some((q) => q.name === name)
  }, [])

  const importQueueManager = useCallback((built: BuiltQueueManager, replace: boolean) => {
    setError(null)
    // Import always operates on the persisted data set (not the possibly-ephemeral sample view),
    // so importing while previewing the sample never corrupts saved topology.
    let base = loadStored() ?? emptyTopology()
    if (base.queueManagers.some((q) => q.name === built.name)) {
      if (!replace) return
      base = removeQueueManager(base, built.name)
    }
    const next: MqTopology = {
      queueManagers: [...base.queueManagers, { name: built.name }],
      queues: [...base.queues, ...built.queues],
      topics: [...base.topics, ...built.topics],
      subscriptions: [...base.subscriptions, ...built.subscriptions],
      channels: [...(base.channels ?? []), ...built.channels],
    }
    persist(next)
    setTopology(next)
    setFileName('saved topology (local storage)')
  }, [])

  // On first load, if there's no saved topology, show the bundled sample as a preview.
  useEffect(() => {
    if (!loadStored()) loadSample()
  }, [loadSample])

  const value = useMemo<TopologyContextValue>(
    () => ({
      topology,
      fileName,
      error,
      loading,
      loadSample,
      loadFile,
      hasStoredQueueManager,
      importQueueManager,
    }),
    [topology, fileName, error, loading, loadSample, loadFile, hasStoredQueueManager, importQueueManager],
  )

  return <TopologyContext.Provider value={value}>{children}</TopologyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTopology(): TopologyContextValue {
  const ctx = useContext(TopologyContext)
  if (!ctx) throw new Error('useTopology must be used within a TopologyProvider')
  return ctx
}
