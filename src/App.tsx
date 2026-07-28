import { useEffect, useMemo, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { Toolbar } from './components/Toolbar'
import { TopologyView } from './components/TopologyView'
import { buildGraph, type MqFlowNode } from './lib/buildGraph'
import { MqParseError, parseMqExport } from './lib/parseMqExport'
import { emptyTopology, type MqTopology } from './types/mq'

const SAMPLE_DATA_URL = `${import.meta.env.BASE_URL}sample-data/mq-topology.json`

function App() {
  const [topology, setTopology] = useState<MqTopology>(emptyTopology())
  const [fileName, setFileName] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const loadSample = () => {
    setError(null)
    fetch(SAMPLE_DATA_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`Could not load sample data (${res.status})`)
        return res.text()
      })
      .then((text) => {
        setTopology(parseMqExport('mq-topology.json', text))
        setFileName('sample-data/mq-topology.json')
        setSelectedNodeId(null)
      })
      .catch((err: Error) => setError(err.message))
  }

  useEffect(() => {
    loadSample()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleFileSelected = (file: File) => {
    setError(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const text = String(reader.result ?? '')
        const parsed = parseMqExport(file.name, text)
        setTopology(parsed)
        setFileName(file.name)
        setSelectedNodeId(null)
      } catch (err) {
        setError(err instanceof MqParseError ? err.message : 'Failed to parse file')
      }
    }
    reader.onerror = () => setError('Failed to read file')
    reader.readAsText(file)
  }

  const { nodes, edges } = useMemo(() => buildGraph(topology), [topology])

  const selectedNode: MqFlowNode | null = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  )

  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100">
      <Toolbar
        fileName={fileName}
        error={error}
        onFileSelected={handleFileSelected}
        onLoadSample={loadSample}
      />
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1">
          <TopologyView
            nodes={nodes}
            edges={edges}
            onNodeClick={(node) => setSelectedNodeId(node.id)}
            onPaneClick={() => setSelectedNodeId(null)}
          />
        </div>
        <Sidebar node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      </div>
    </div>
  )
}

export default App
