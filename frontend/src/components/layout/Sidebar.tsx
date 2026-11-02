import React, { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { clsx } from 'clsx';

interface SidebarProps {
  currentProjectId?: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentProjectId }) => {
  const location = useLocation();

  // Automatically keep studio suite open if visiting a studio page
  const isStudioRoute = [
    '/scenes',
    '/assets',
    '/preview',
    '/thumbnails',
    '/seo',
    '/youtube',
  ].some((r) => location.pathname.includes(r));

  const [isStudioOpen, setIsStudioOpen] = useState(true);

  // Auto-expand if navigating into a studio route or active project
  useEffect(() => {
    if (isStudioRoute || currentProjectId) {
      setIsStudioOpen(true);
    }
  }, [isStudioRoute, currentProjectId]);

  const coreNav = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    {
      label: 'Daily Reels Autopilot',
      path: '/automation',
      icon: Flame,
      badge: 'HOT',
      isHot: true,
    },
    { label: 'Video Projects', path: '/projects', icon: Video },
    {
      label: 'AI Agent Monitor',
      path: currentProjectId ? `/project/${currentProjectId}/agents` : '/agents',
      icon: Cpu,
    },
  ];

  const studioNav = [
    { label: 'Scene Editor', path: currentProjectId ? `/project/${currentProjectId}/scenes` : '/scenes', icon: Layers },
    { label: 'Asset Library', path: currentProjectId ? `/project/${currentProjectId}/assets` : '/assets', icon: FolderOpen },
    { label: 'Video Preview', path: currentProjectId ? `/project/${currentProjectId}/preview` : '/preview', icon: PlaySquare },
    { label: 'Thumbnail Studio', path: currentProjectId ? `/project/${currentProjectId}/thumbnails` : '/thumbnails', icon: ImageIcon },
    { label: 'SEO & Hashtags', path: currentProjectId ? `/project/${currentProjectId}/seo` : '/seo', icon: Search },
    { label: 'YouTube Publishing', path: '/youtube', icon: Share2 },
  ];

  const configNav = [
    { label: 'Social Accounts', path: '/settings/social', icon: Share2, sub: 'IG & FB' },
    { label: 'AI Provider Matrix', path: '/settings/providers', icon: Sliders, sub: 'Models' },
    { label: 'App Settings', path: '/settings/app', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950/95 backdrop-blur-2xl border-r border-slate-800/70 flex flex-col shrink-0 sticky top-0 h-screen select-none z-30 transition-all">
      {/* Brand Logo & Header */}
      <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2.5 group">
          <div className="relative w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all duration-300">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-emerald-400 border-2 border-slate-950 rounded-full" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-white text-sm tracking-tight">AutoTube</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-brand-500/15 text-brand-300 border border-brand-500/30 font-semibold tracking-wide">
                AI
              </span>
            </div>
            <p className="text-[10px] text-slate-400">Autonomous Video Studio</p>
          </div>
        </NavLink>
      </div>

      {/* Quick Action: New Video Project */}
      <div className="px-3 pt-3">
        <NavLink
          to="/create"
          className={({ isActive }) =>
            clsx(
              'w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 shadow-sm',
              isActive
                ? 'bg-brand-500 text-white shadow-brand-500/30 ring-1 ring-brand-400'
                : 'bg-gradient-to-r from-brand-600 via-brand-500 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white shadow-brand-600/20 hover:shadow-brand-500/30 hover:scale-[1.01]'
            )
          }
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>New Video Project</span>
        </NavLink>
      </div>

      {/* Navigation - Zero Scrollbar & Tightly Styled */}
      <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-3.5">
        {/* 1. Core Platform */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-2 mb-1">
            Platform
          </p>
          <nav className="space-y-0.5">
            {coreNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-500/15 text-white border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : item.isHot
                      ? 'text-amber-300/90 hover:text-amber-200 bg-amber-500/5 hover:bg-amber-500/10 border border-amber-500/20'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon
                        className={clsx(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-brand-400'
                            : item.isHot
                            ? 'text-amber-400'
                            : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
                        {item.badge}
                      </span>
                    )}

                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-500 rounded-r" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>

        {/* 2. Production Studio Suite (Collapsible Accordion) */}
        <div>
          <button
            type="button"
            onClick={() => setIsStudioOpen(!isStudioOpen)}
            className="w-full flex items-center justify-between px-2 py-1 text-[10px] font-semibold text-slate-400 tracking-wider uppercase hover:text-slate-300 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <span>Studio Suite</span>
              {currentProjectId && (
                <span className="text-[9px] font-mono lowercase px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  active
                </span>
              )}
            </div>
            {isStudioOpen ? (
              <ChevronDown className="w-3 h-3 text-slate-400" />
            ) : (
              <ChevronRight className="w-3 h-3 text-slate-400" />
            )}
          </button>

          {isStudioOpen && (
            <nav className="mt-1 ml-2.5 pl-2 border-l border-slate-800/80 space-y-0.5 animate-fadeIn">
              {studioNav.map((item) => (
                <NavLink
                  key={item.label}
                  to={item.path}
                  className={({ isActive }) =>
                    clsx(
                      'group relative flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                      isActive
                        ? 'bg-brand-500/15 text-white border border-brand-500/30 shadow-xs'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                    )
                  }
                >
                  {({ isActive }) => (
                    <>
                      <item.icon
                        className={clsx(
                          'w-3.5 h-3.5 shrink-0 transition-colors',
                          isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                      {isActive && (
                        <span className="absolute -left-[9px] top-1.5 bottom-1.5 w-1 bg-brand-500 rounded-r" />
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </nav>
          )}
        </div>

        {/* 3. Settings & Configuration */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase px-2 mb-1">
            Configuration
          </p>
          <nav className="space-y-0.5">
            {configNav.map((item) => (
              <NavLink
                key={item.label}
                to={item.path}
                className={({ isActive }) =>
                  clsx(
                    'group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-brand-500/15 text-white border border-brand-500/30 shadow-sm shadow-brand-500/10'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon
                        className={clsx(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive ? 'text-brand-400' : 'text-slate-400 group-hover:text-slate-200'
                        )}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.sub && (
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.sub}
                      </span>
                    )}
                    {isActive && (
                      <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-brand-500 rounded-r" />
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      {/* Modern Status Footer */}
      <div className="p-3 border-t border-slate-800/80 bg-slate-950/80">
        <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <div className="truncate">
              <p className="text-[11px] font-semibold text-white leading-tight">AI Engines Live</p>
              <p className="text-[9px] text-slate-400 font-mono">Orchestrator Ready</p>
            </div>
          </div>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            v2.0
          </span>
        </div>
      </div>
    </aside>
  );
};
