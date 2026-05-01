import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav }  from './TopNav';

export function Layout() {
  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F8FC' }}>
      {/* Sidebar */}
      <Sidebar />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
