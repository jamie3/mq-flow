import { Outlet } from 'react-router-dom'
import { SideMenu } from './SideMenu'
import { TopBar } from './TopBar'

export function Layout() {
  return (
    <div className="flex h-screen w-screen flex-col bg-slate-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        <SideMenu />
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
