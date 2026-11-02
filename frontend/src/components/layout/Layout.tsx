import React, { useEffect, useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const Layout: React.FC = () => {
  const location = useLocation();
  const params = useParams();
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  useEffect(() => {
    // Check if URL has projectId
    const match = location.pathname.match(/\/project\/([^\/]+)/);
    if (match && match[1]) {
      setActiveProjectId(match[1]);
      localStorage.setItem('activeProjectId', match[1]);
    } else {
      const stored = localStorage.getItem('activeProjectId');
      if (stored) setActiveProjectId(stored);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      {/* Sidebar */}
      <Sidebar currentProjectId={activeProjectId} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-6 w-full">
          <Outlet context={{ activeProjectId, setActiveProjectId }} />
        </main>
      </div>
    </div>
  );
};

