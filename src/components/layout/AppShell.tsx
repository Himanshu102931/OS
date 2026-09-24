import React from 'react';
import { usePlacement } from '../../context/PlacementContext';
import type { RoutePath } from '../../context/PlacementContext';
import type { PlacementMode } from '../../types';
import {
  LayoutDashboard,
  Map,
  Code2,
  Sparkles,
  Building2,
  BarChart3,
  Settings,
  Calendar,
  Layers,
  Compass,
} from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { currentRoute, setRoute, todayDate, activePhase, currentMode, setPlacementMode } = usePlacement();

  const navItems: { id: RoutePath; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'dashboard', label: 'Today', icon: LayoutDashboard },
    { id: 'roadmap', label: 'Roadmap', icon: Map },
    { id: 'dsa', label: 'DSA Bank', icon: Code2 },
    { id: 'skills', label: 'Skills Matrix', icon: Sparkles },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'analytics', label: 'Analytics & Review', icon: BarChart3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getPageTitle = (route: RoutePath): string => {
    switch (route) {
      case 'dashboard': return 'Today / Daily Action Plan';
      case 'roadmap': return 'Master Roadmap';
      case 'dsa': return 'DSA Problem Tracker';
      case 'skills': return 'Skills Matrix';
      case 'companies': return 'Target Companies';
      case 'analytics': return 'Analytics & Review';
      case 'settings': return 'Settings';
      default: return 'PlacementOS';
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#09090b] text-zinc-100 selection:bg-indigo-600 selection:text-white">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Brand & Page Context */}
          <div className="flex items-center gap-3">
            <div className="size-7 rounded-md bg-zinc-800 border border-zinc-700/80 flex items-center justify-center text-zinc-200">
              <Compass className="size-4 text-indigo-400" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-100">PlacementOS</span>
              <span className="text-zinc-600">/</span>
              <span className="text-xs font-medium text-zinc-400">{getPageTitle(currentRoute)}</span>
            </div>
          </div>

          {/* Global Header Controls */}
          <div className="flex items-center gap-3">
            {/* Mode Selector */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs">
              <span className="text-zinc-500 font-medium text-[11px]">Mode:</span>
              <select
                value={currentMode}
                onChange={(e) => setPlacementMode(e.target.value as PlacementMode)}
                className="bg-transparent text-zinc-200 font-medium focus:outline-none cursor-pointer text-xs"
              >
                <option value="normal" className="bg-zinc-900 text-zinc-200">Normal</option>
                <option value="reduced" className="bg-zinc-900 text-zinc-200">Reduced</option>
                <option value="exam" className="bg-zinc-900 text-zinc-200">Exam</option>
                <option value="placement_sprint" className="bg-zinc-900 text-zinc-200">Placement Sprint</option>
              </select>
            </div>

            {/* Active Phase Badge */}
            <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-400">
              <Layers className="size-3.5 text-zinc-400" />
              <span className="text-zinc-300 font-medium text-[11px]">{activePhase.name}</span>
            </div>

            {/* Today Date */}
            <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-400">
              <Calendar className="size-3.5 text-zinc-400" />
              <span className="font-mono text-zinc-300 text-[11px]">{todayDate}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main App Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-56 border-b md:border-b-0 md:border-r border-zinc-800/80 bg-[#09090b] p-3 shrink-0 flex flex-col justify-between">
          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentRoute === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setRoute(item.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors text-left whitespace-nowrap ${
                    isActive
                      ? 'bg-zinc-800/90 text-zinc-100 border border-zinc-700/60 font-semibold'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? 'text-indigo-400' : 'text-zinc-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Quiet System Footer */}
          <div className="mt-6 pt-4 border-t border-zinc-800/80 hidden md:block px-2 text-[11px] text-zinc-500 space-y-1">
            <div className="flex justify-between">
              <span>PlacementOS</span>
              <span className="font-mono text-zinc-400">v1.0.0</span>
            </div>
            <div className="flex justify-between">
              <span>Storage</span>
              <span className="text-zinc-400">Local (Offline)</span>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 min-w-0 bg-[#09090b]">
          {children}
        </main>
      </div>
    </div>
  );
};
