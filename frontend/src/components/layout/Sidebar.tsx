import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  Video,
  Cpu,
  Layers,
  FolderOpen,
  PlaySquare,
  Image as ImageIcon,
  Search,
  Share2,
  Sliders,
  Settings,
  Sparkles,
  Flame,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  currentProjectId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentProjectId }) => {
  const mainNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Daily Reels Autopilot', path: '/automation', icon: Flame, highlight: true },
    { label: 'Create New Video', path: '/create', icon: PlusCircle },
    { label: 'Video Projects', path: '/projects', icon: Video },
    { label: 'AI Agent Monitor', path: currentProjectId ? `/project/${currentProjectId}/agents` : '/agents', icon: Cpu },
  ];

  const projectStudioNav = [
    { label: 'Scene Editor', path: currentProjectId ? `/project/${currentProjectId}/scenes` : '/scenes', icon: Layers },
    { label: 'Asset Library', path: currentProjectId ? `/project/${currentProjectId}/assets` : '/assets', icon: FolderOpen },
    { label: 'Video Preview', path: currentProjectId ? `/project/${currentProjectId}/preview` : '/preview', icon: PlaySquare },
    { label: 'Thumbnail Generator', path: currentProjectId ? `/project/${currentProjectId}/thumbnails` : '/thumbnails', icon: ImageIcon },
    { label: 'SEO Manager', path: currentProjectId ? `/project/${currentProjectId}/seo` : '/seo', icon: Search },
    { label: 'YouTube Publishing', path: '/youtube', icon: Share2 },
  ];

  const settingsNav = [
    { label: 'Social Accounts', path: '/settings/social', icon: Share2 },
    { label: 'AI Providers', path: '/settings/providers', icon: Sliders },
    { label: 'App Settings', path: '/settings/app', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900/90 backdrop-blur-md border-r border-slate-800 flex flex-col shrink-0 min-h-screen">
      {/* Brand Logo */}
      <div className="p-5 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="font-bold text-white tracking-tight flex items-center gap-1.5 text-base">
            AutoTube <span className="text-xs px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 border border-brand-500/30 font-semibold">AI</span>
          </h1>
          <p className="text-xs text-slate-400">Autonomous Video Studio</p>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-3 mb-2">Core Platform</p>
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : item.highlight
                      ? 'text-brand-300 bg-brand-950/40 hover:bg-brand-900/50 border border-brand-800/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Production Studio</p>
            {currentProjectId && (
              <span className="text-[10px] bg-brand-500/20 text-brand-300 px-1.5 py-0.2 rounded font-mono">
                Active
              </span>
            )}
          </div>
          <nav className="space-y-1">
            {projectStudioNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase px-3 mb-2">Configuration</p>
          <nav className="space-y-1">
            {settingsNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  )
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Footer System Status */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Orchestrator Ready</span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
};

