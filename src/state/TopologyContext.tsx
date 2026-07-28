import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { MqParseError, parseMqExport } from '../lib/parseMqExport'
import { emptyTopology, type MqTopology } from '../types/mq'

const SAMPLE_DATA_URL = `${import.meta.env.BASE_URL}sample-data/mq-topology.json`

interface TopologyContextValue {
  topology: MqTopology
  fileName: string | null
  error: string | null
  loading: boolean
  loadSample: () => void
  loadFile: (file: File) => void
}

const TopologyContext = createContext<TopologyContextValue | null>(null)

export function TopologyProvider({ children }: { children: ReactNode }) {
  const [topology, setTopology] = useState<MqTopology>(emptyTopology())
  const [fileName, setFileName] = useState<string | null>(null)
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

  useEffect(() => {
    loadSample()
  }, [loadSample])

  const value = useMemo<TopologyContextValue>(
    () => ({ topology, fileName, error, loading, loadSample, loadFile }),
    [topology, fileName, error, loading, loadSample, loadFile],
  )

  return <TopologyContext.Provider value={value}>{children}</TopologyContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTopology(): TopologyContextValue {
  const ctx = useContext(TopologyContext)
  if (!ctx) throw new Error('useTopology must be used within a TopologyProvider')
  return ctx
}
