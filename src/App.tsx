import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ListPage } from './pages/ListPage'
import { ObjectFlowPage } from './pages/ObjectFlowPage'
import { OverviewPage } from './pages/OverviewPage'
import { TopologyProvider } from './state/TopologyContext'

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <OverviewPage /> },
      { path: 'list/:slug', element: <ListPage /> },
      { path: 'object/:kind/:qm/:name', element: <ObjectFlowPage /> },
    ],
  },
])

function App() {
  return (
    <TopologyProvider>
      <RouterProvider router={router} />
    </TopologyProvider>
  )
}

export default App
