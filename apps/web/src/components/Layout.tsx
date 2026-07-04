import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav }  from './TopNav';

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#F7F8FC' }}>
      {/* Sidebar */}
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <TopNav onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
